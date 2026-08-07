import React, { useState, useEffect } from "react";
import { Folder, Play, Plus, Loader2, Music, Trash2, Link as LinkIcon, RefreshCw, FolderOpen, ArrowRight } from "lucide-react";
import { parseGdriveFolderId } from "../utils/gdrive";
import { predefinedFolders, predefinedFiles } from "../utils/gdriveFolders";

export interface GDriveFolder {
  id: string;
  name: string;
  songCount?: number;
}

export interface GDriveSong {
  id: string;
  name: string;
  mimeType: string;
  size: string;
}

interface GoogleDriveAlbumProps {
  onPlaySong: (url: string, title: string, coverUrl?: string) => void;
}

export const GoogleDriveAlbum: React.FC<GoogleDriveAlbumProps> = ({ onPlaySong }) => {
  const [folders, setFolders] = useState<GDriveFolder[]>(() => {
    try {
      const saved = localStorage.getItem("gdrive_folders");
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed.length > 0) return parsed;
      }
    } catch {}
    return predefinedFolders;
  });
  const [inputUrl, setInputUrl] = useState("");
  const [isAdding, setIsAdding] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isInputVisible, setIsInputVisible] = useState(false);

  const [selectedFolder, setSelectedFolder] = useState<GDriveFolder | null>(null);
  const [songs, setSongs] = useState<GDriveSong[]>([]);
  const [isLoadingSongs, setIsLoadingSongs] = useState(false);

  useEffect(() => {
    let isCancelled = false;
    const fetchCounts = async () => {
      // Find folders that need counts
      // We don't want to loop over all of them if they already have counts.
      const toFetch = folders.filter(f => f.songCount === undefined);
      if (toFetch.length === 0) return;
      
      for (const folder of toFetch) {
        if (isCancelled) break;
        
        let count = 0;
        try {
          if (folder.id === "DIRECT_FILES") {
            count = predefinedFiles.length;
          } else {
            const res = await fetch(`/api/gdrive/files?folderId=${folder.id}`);
            if (res.ok) {
              const data = await res.json();
              const validSongs = (data.files || []).filter((f: any) => 
                f.mimeType.startsWith("audio/") || f.name.endsWith(".mp3") || f.name.endsWith(".wav") || f.name.endsWith(".flac") || f.name.endsWith(".m4a")
              );
              count = validSongs.length;
            } else {
              continue; // Skip updating on error
            }
          }
          
          if (!isCancelled) {
            setFolders(prev => prev.map(f => f.id === folder.id ? { ...f, songCount: count } : f));
          }
        } catch (e) {
          // Ignore
        }
        await new Promise(r => setTimeout(r, 200));
      }
    };
    
    fetchCounts();
    return () => {
      isCancelled = true;
    };
  }, [folders.length]);


  useEffect(() => {
    localStorage.setItem("gdrive_folders", JSON.stringify(folders));
  }, [folders]);

  const handleAddFolder = async () => {
    setError(null);
    if (!inputUrl.trim()) return;

    const folderId = parseGdriveFolderId(inputUrl);
    if (!folderId) {
      setError("Invalid Google Drive folder URL or ID.");
      return;
    }

    if (folders.some((f) => f.id === folderId)) {
      setError("Folder already added.");
      return;
    }

    setIsAdding(true);
    try {
      // Fetch metadata to check if valid and get name
      const res = await fetch(`/api/gdrive/files?folderId=${folderId}`);
      if (!res.ok) {
        throw new Error("Could not access folder. Check permissions or API key.");
      }
      
      const newFolder: GDriveFolder = { id: folderId, name: `Folder: ${folderId.substring(0, 8)}...` };
      setFolders((prev) => [newFolder, ...prev]);
      setInputUrl("");
    } catch (err: any) {
      setError(err.message || "Failed to add folder");
    } finally {
      setIsAdding(false);
    }
  };

  const removeFolder = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setFolders((prev) => prev.filter((f) => f.id !== id));
    if (selectedFolder?.id === id) {
      setSelectedFolder(null);
      setSongs([]);
    }
  };

  const loadFolder = async (folder: GDriveFolder) => {
    setSelectedFolder(folder);
    setIsLoadingSongs(true);
    setError(null);
    setSongs([]);

    if (folder.id === "DIRECT_FILES") {
      setSongs(predefinedFiles.map((f: any) => ({
        id: f.id,
        name: f.name + ".mp3",
        mimeType: "audio/mpeg",
        size: "5000000"
      })));
      setIsLoadingSongs(false);
      return;
    }

    try {
      const res = await fetch(`/api/gdrive/files?folderId=${folder.id}`);
      if (!res.ok) {
        const text = await res.text();
        let errorMsg = text;
        try {
          const json = JSON.parse(text);
          if (json.error) errorMsg = json.error;
        } catch(e) {}
        throw new Error(errorMsg || "Failed to load folder. Ensure GOOGLE_DRIVE_API_KEY is configured in AI Studio Secrets.");
      }
      const data = await res.json();
      
      const validSongs = (data.files || []).filter((f: any) => 
        f.mimeType.startsWith("audio/") || f.name.endsWith(".mp3") || f.name.endsWith(".wav") || f.name.endsWith(".flac") || f.name.endsWith(".m4a")
      );
      
      setSongs(validSongs);
    } catch (err: any) {
      setError(err.message || "Failed to load songs");
    } finally {
      setIsLoadingSongs(false);
    }
  };

  const playSong = (song: GDriveSong) => {
    const playUrl = `/api/gdrive/stream?id=${song.id}`;
    onPlaySong(playUrl, song.name.replace(/\.[^/.]+$/, ""), "https://images.unsplash.com/photo-1614613535308-eb5fbd3d2c17?q=80&w=300");
  };

  return (
    <div className="w-full flex flex-col h-full bg-black/40 rounded-xl border border-white/5 overflow-hidden">
      <div className="p-4 border-b border-white/5 flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <h3 className="text-white font-bold text-sm flex items-center gap-2">
            <FolderOpen className="w-4 h-4 text-amber-400" />
            Google Drive Albums
          </h3>
          <button
            onClick={() => setIsInputVisible(!isInputVisible)}
            className="text-white/40 hover:text-white transition-colors"
            title="Add Google Drive Folder"
          >
            <Plus className="w-4 h-4" />
          </button>
        </div>
        
        {isInputVisible && (
          <>
            <p className="text-[10px] text-white/50 leading-relaxed">
              Add public Google Drive folders containing audio files. They must be publicly accessible.
            </p>
            
            <div className="flex gap-2">
          <div className="relative flex-1">
            <LinkIcon className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-white/40" />
            <input
              type="text"
              value={inputUrl}
              onChange={(e) => setInputUrl(e.target.value)}
              placeholder="Paste Google Drive folder URL..."
              className="w-full bg-white/5 border border-white/10 rounded-lg py-1.5 pl-8 pr-3 text-xs text-white placeholder:text-white/30 focus:outline-none focus:border-amber-400/50 transition-colors"
              onKeyDown={(e) => e.key === "Enter" && handleAddFolder()}
            />
          </div>
          <button
            onClick={handleAddFolder}
            disabled={isAdding || !inputUrl.trim()}
            className="bg-amber-400/10 hover:bg-amber-400/20 text-amber-400 px-3 rounded-lg text-xs font-bold transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1.5"
          >
            {isAdding ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Plus className="w-3.5 h-3.5" />}
            Add
          </button>
            </div>
            {error && <div className="text-red-400 text-[10px] bg-red-400/10 px-2.5 py-1.5 rounded">{error}</div>}
          </>
        )}
      </div>

      <div className="flex flex-1 min-h-0">
        {/* Sidebar: Folders */}
        <div className="w-1/3 min-w-[120px] max-w-[200px] border-r border-white/5 flex flex-col overflow-y-auto scrollbar-thin scrollbar-thumb-white/10 scrollbar-track-transparent">
          {folders.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-32 px-4 text-center opacity-40">
              <Folder className="w-8 h-8 mb-2" />
              <span className="text-[10px]">No folders added</span>
            </div>
          ) : (
            <div className="flex flex-col p-2 gap-1">

              {folders
                .filter(f => f.songCount === undefined || f.songCount > 0)
                .sort((a, b) => (b.songCount || 0) - (a.songCount || 0))
                .map((folder) => (

                <div
                  key={folder.id}
                  onClick={() => loadFolder(folder)}
                  className={`group relative flex items-center gap-2 p-2 rounded-lg cursor-pointer transition-all ${
                    selectedFolder?.id === folder.id 
                      ? "bg-amber-400/10 text-amber-400" 
                      : "hover:bg-white/5 text-white/70"
                  }`}
                >
                  <Folder className="w-4 h-4 shrink-0" />
                  <div className="flex-1 min-w-0 overflow-hidden flex flex-col">
                    <span className="text-[11px] font-medium truncate" title={folder.name}>
                      {folder.name}
                    </span>
                    {folder.songCount !== undefined && (
                      <span className="text-[9px] text-white/40">{folder.songCount} {folder.songCount === 1 ? 'song' : 'songs'}</span>
                    )}
                  </div>
                  <button 
                    onClick={(e) => removeFolder(folder.id, e)}
                    className="opacity-0 group-hover:opacity-100 p-1 hover:text-red-400 transition-colors shrink-0"
                    title="Remove folder"
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Main: Songs */}
        <div className="flex-1 overflow-y-auto scrollbar-thin scrollbar-thumb-white/10 scrollbar-track-transparent bg-black/20">
          {!selectedFolder ? (
            <div className="flex flex-col items-center justify-center h-full text-center opacity-40">
              <ArrowRight className="w-8 h-8 mb-2" />
              <span className="text-[11px]">Select a folder to view songs</span>
            </div>
          ) : isLoadingSongs ? (
            <div className="flex flex-col items-center justify-center h-full text-amber-400/70">
              <RefreshCw className="w-6 h-6 animate-spin mb-2" />
              <span className="text-[10px] uppercase tracking-wider font-bold">Loading Files...</span>
            </div>
          ) : songs.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center opacity-40">
              <Music className="w-8 h-8 mb-2" />
              <span className="text-[11px]">No audio files found in this folder</span>
            </div>
          ) : (
            <div className="flex flex-col p-2 gap-1">
              {songs.map((song) => (
                <div 
                  key={song.id}
                  className="group flex items-center justify-between p-2 hover:bg-white/5 rounded-lg transition-colors cursor-pointer"
                  onClick={() => playSong(song)}
                >
                  <div className="flex items-center gap-3 overflow-hidden">
                    <div className="w-8 h-8 rounded bg-white/5 flex items-center justify-center shrink-0 group-hover:bg-amber-400/20 transition-colors">
                      <Music className="w-4 h-4 text-white/40 group-hover:text-amber-400" />
                    </div>
                    <div className="flex flex-col truncate">
                      <span className="text-white text-xs font-medium truncate" title={song.name}>
                        {song.name.replace(/\.[^/.]+$/, "")}
                      </span>
                      <span className="text-white/40 text-[9px]">
                        {(parseInt(song.size) / (1024 * 1024)).toFixed(1)} MB • {song.name.split('.').pop()?.toUpperCase()}
                      </span>
                    </div>
                  </div>
                  <button className="w-8 h-8 rounded-full bg-white/10 hover:bg-amber-400 hover:text-black flex items-center justify-center shrink-0 transition-all opacity-0 group-hover:opacity-100">
                    <Play className="w-3.5 h-3.5 ml-0.5" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
