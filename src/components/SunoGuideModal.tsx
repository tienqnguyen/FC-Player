import React, { useState } from 'react';
import { X, Search, BookOpen, Music, Mic, Layers, Settings, Waves, FileText, Copy, Check } from 'lucide-react';

const GUIDE_DATA = [
    {
        category: "1. Cấu trúc bài hát (Structure)",
        icon: <Layers className="w-4 h-4" />,
        items: [
            { tag: "[Intro]", desc: "Đoạn dạo đầu, thường không có lời." },
            { tag: "[Verse]", desc: "Phiên khúc (đoạn trình bày nội dung chính)." },
            { tag: "[Pre-Chorus]", desc: "Tiền điệp khúc (đoạn chuyển tiếp, đẩy cao trào trước điệp khúc)." },
            { tag: "[Chorus]", desc: "Điệp khúc (đoạn bùng nổ, bắt tai nhất, lặp lại nhiều lần)." },
            { tag: "[Bridge]", desc: "Đoạn chuyển (thường mang giai điệu/cảm xúc khác biệt để tạo điểm nhấn)." },
            { tag: "[Outro]", desc: "Đoạn kết thúc bài hát." },
            { tag: "[Instrumental Break]", desc: "Đoạn nhạc cụ chơi độc lập giữa bài, không có giọng hát." },
            { tag: "[Guitar Solo]", desc: "Đoạn nhạc cụ guitar chơi độc tấu kỹ thuật cao." },
            { tag: "[Piano Solo]", desc: "Đoạn nhạc cụ piano chơi độc tấu." },
            { tag: "[Drop]", desc: "Đoạn cao trào bùng nổ (thường dùng trong nhạc EDM)." },
            { tag: "[Beat Switch]", desc: "Đổi nhịp, đổi beat đột ngột." },
            { tag: "[Build-up]", desc: "Đoạn dồn dập, tăng dần năng lượng." },
            { tag: "[Silence]", desc: "Khoảng lặng đột ngột. Cực kỳ hiệu quả để tạo điểm nhấn trước câu hát quan trọng." },
            { tag: "[Fade Out]", desc: "Nhạc nhỏ dần rồi kết thúc." },
            { tag: "[Acapella Intro]", desc: "Mở đầu bài hát chỉ bằng giọng hát, không nhạc cụ." },
            { tag: "[Hook]", desc: "Đoạn nhạc hoặc câu hát ngắn lặp đi lặp lại cực kỳ bắt tai." }
        ]
    },
    {
        category: "2. Giọng Hát (Vocals)",
        icon: <Mic className="w-4 h-4" />,
        items: [
            { tag: "[Male vocal]", desc: "Giọng nam." },
            { tag: "[Female vocal]", desc: "Giọng nữ." },
            { tag: "[Deep baritone]", desc: "Giọng nam trầm, ấm và sâu." },
            { tag: "[Tenor vocal]", desc: "Giọng nam cao, sáng." },
            { tag: "[Alto vocal]", desc: "Giọng nữ trầm, dày và ấm." },
            { tag: "[Soprano vocal]", desc: "Giọng nữ cao vút, trong trẻo." },
            { tag: "[Breathy vocal]", desc: "Giọng hát nhiều hơi, thều thào, mang tính tâm sự." },
            { tag: "[Raspy vocal]", desc: "Giọng khàn, bụi bặm (thường thấy trong Rock/Blues)." },
            { tag: "[Gravelly voice]", desc: "Giọng cực kỳ khàn đặc, thô ráp." },
            { tag: "[Ethereal vocal]", desc: "Giọng hát bay bổng, ảo diệu, siêu thực." },
            { tag: "[Whispering]", desc: "Thì thầm sát micro." },
            { tag: "[Screaming]", desc: "Gào thét (thường dùng cho Metal/Hardcore)." },
            { tag: "[Growling]", desc: "Gầm gừ (thường dùng trong Death Metal)." },
            { tag: "[Choir]", desc: "Dàn đồng ca." },
            { tag: "[Gospel choir]", desc: "Dàn đồng ca nhà thờ, hùng hồn, mạnh mẽ." },
            { tag: "[Children's choir]", desc: "Dàn đồng ca thiếu nhi, trong sáng." },
            { tag: "[Harmonies]", desc: "Hát bè, hòa âm nhiều lớp giọng." },
            { tag: "[Layered vocals]", desc: "Nhiều lớp giọng hát chồng lên nhau tạo độ dày." },
            { tag: "[Vocoder]", desc: "Giọng hát điện tử bị biến dạng (như Daft Punk)." },
            { tag: "[Autotune]", desc: "Giọng hát sử dụng hiệu ứng Autotune rõ rệt (Hip Hop/Trap)." },
            { tag: "[A cappella]", desc: "Chỉ có giọng hát, không có nhạc cụ đệm." },
            { tag: "[Spoken word]", desc: "Đọc thơ hoặc nói chuyện trên nền nhạc." },
            { tag: "[Rap verse]", desc: "Đoạn đọc rap." },
            { tag: "[Mumble rap]", desc: "Rap lầm bầm, flow nhanh, ít rõ lời." }
        ]
    },
    {
        category: "3. Nhạc Cụ (Instruments)",
        icon: <Music className="w-4 h-4" />,
        items: [
            // Guitars
            { tag: "[Acoustic guitar]", desc: "Đàn guitar mộc." },
            { tag: "[Nylon string guitar]", desc: "Đàn guitar cổ điển (dây nilon), âm thanh êm, trầm ấm." },
            { tag: "[Fingerpicked guitar]", desc: "Guitar gảy ngón, êm ái." },
            { tag: "[Strummed acoustic]", desc: "Guitar mộc quạt chả, rộn ràng." },
            { tag: "[Clean electric guitar]", desc: "Guitar điện âm thanh trong trẻo." },
            { tag: "[Distorted electric guitar]", desc: "Guitar điện méo tiếng, chát chúa (Rock/Metal)." },
            { tag: "[Overdriven guitar]", desc: "Guitar điện rè nhẹ, gai góc (Blues/Rock)." },
            { tag: "[Muted guitar]", desc: "Guitar đánh ngắt tiếng (palm mute)." },
            { tag: "[Wah-wah guitar]", desc: "Guitar dùng phôi wah-wah (thường thấy trong Funk)." },
            // Pianos & Keys
            { tag: "[Grand piano]", desc: "Đàn dương cầm cổ điển, âm thanh lớn và sáng." },
            { tag: "[Felt piano]", desc: "Piano đánh rất êm, có cảm giác nỉ chặn dây (phù hợp nhạc buồn/Lofi)." },
            { tag: "[Rhodes piano]", desc: "Piano điện cổ điển, âm thanh ấm, rung nhẹ (Jazz/R&B)." },
            { tag: "[Wurlitzer]", desc: "Piano điện, âm thanh hơi rè và gai góc hơn Rhodes." },
            { tag: "[Hammond organ]", desc: "Đàn organ nhà thờ/Blues, âm thanh cuộn xoáy." },
            { tag: "[Synthesizer]", desc: "Đàn điện tử tổng hợp âm thanh." },
            { tag: "[Analog synthesizer]", desc: "Tiếng synth giả lập analog cổ điển, dày dặn." },
            { tag: "[Arpeggiator]", desc: "Synth chạy nốt rải liên tục." },
            { tag: "[FM synth]", desc: "Synth điện tử mang âm hưởng thập niên 80." },
            // Strings
            { tag: "[Cinematic strings]", desc: "Dàn nhạc dây (violin, cello) mang hơi hướng nhạc phim hoành tráng." },
            { tag: "[Plucked strings]", desc: "Tiếng đàn dây gảy (pizzicato), tạo cảm giác vui tươi hoặc bí ẩn." },
            { tag: "[Solo violin]", desc: "Một cây đàn violin độc tấu, da diết." },
            { tag: "[Cello low drone]", desc: "Tiếng Cello trầm kéo dài liên tục tạo nền." },
            { tag: "[String quartet]", desc: "Tứ tấu đàn dây, âm thanh cổ điển thính phòng." },
            { tag: "[Morin Khuur]", desc: "Đàn Mã Đầu Cầm (Mông Cổ), âm thanh da diết, nức nở." },
            { tag: "[Erhu]", desc: "Đàn nhị (Trung Quốc), réo rắt, bi thương." },
            // Bass
            { tag: "[Acoustic upright bass]", desc: "Đàn bass mộc khổng lồ (thường dùng trong Jazz)." },
            { tag: "[Electric bass]", desc: "Đàn bass điện tiêu chuẩn." },
            { tag: "[Slap bass]", desc: "Tiếng bass nảy, giật (Funk/Disco)." },
            { tag: "[Fretless bass]", desc: "Bass không phím, âm thanh trượt rất mượt mà." },
            { tag: "[808 sub bass]", desc: "Tiếng bass trầm, ngân dài, rung loa (Trap/Hip Hop)." },
            { tag: "[Reese bass]", desc: "Tiếng bass điện tử gầm gừ, dày đặc (DnB/Dubstep)." },
            // Drums & Percussion
            { tag: "[Acoustic drum kit]", desc: "Bộ trống cơ tiêu chuẩn." },
            { tag: "[Heavy drums]", desc: "Trống đánh mạnh, uy lực." },
            { tag: "[Brushed drums]", desc: "Trống đánh bằng chổi quét, cực kỳ êm ái (Jazz/Acoustic)." },
            { tag: "[Electronic drum machine]", desc: "Máy trống điện tử (như TR-808, TR-909)." },
            { tag: "[Four on the floor]", desc: "Nhịp trống dậm nhịp 4/4 đều đặn (House/Disco)." },
            { tag: "[Breakbeat]", desc: "Nhịp trống gãy, dồn dập." },
            { tag: "[Bongos / Congas]", desc: "Trống gõ tay Latin." },
            { tag: "[Shaker / Tambourine]", desc: "Các loại nhạc cụ lắc tay tạo nhịp điệu nhẹ." },
            { tag: "[Orchestral percussion]", desc: "Dàn trống gõ giao hưởng hoành tráng (Timpani, Cymbals)." },
            // Brass & Woodwinds
            { tag: "[Trumpet solo]", desc: "Kèn Trumpet độc tấu (Jazz)." },
            { tag: "[Muted trumpet]", desc: "Kèn Trumpet bịt loa, âm thanh nghẹt, bí ẩn." },
            { tag: "[Saxophone]", desc: "Kèn Saxophone, âm thanh lãng mạn, khêu gợi." },
            { tag: "[Brass section]", desc: "Dàn kèn đồng mạnh mẽ (Funk/Soul)." },
            { tag: "[Flute]", desc: "Sáo tây, trong trẻo, nhẹ nhàng." },
            { tag: "[Bansuri]", desc: "Sáo trúc Ấn Độ, mang tính thiền định." },
            { tag: "[Duduk]", desc: "Kèn sậy Armenia, âm thanh cực kỳ bi thương, sa mạc." }
        ]
    },
    {
        category: "4. Không Gian & Hiệu Ứng (Atmosphere & FX)",
        icon: <Waves className="w-4 h-4" />,
        items: [
            // Atmospheres
            { tag: "[Cinematic]", desc: "Hoành tráng, mang tính điện ảnh." },
            { tag: "[Atmospheric]", desc: "Không gian rộng lớn, mơ màng." },
            { tag: "[Ethereal]", desc: "Mộng mị, sương khói, thoát tục." },
            { tag: "[Melancholic]", desc: "Buồn bã, u sầu." },
            { tag: "[Dark / Ominous]", desc: "Đen tối, rùng rợn, điềm gở." },
            { tag: "[Euphoric]", desc: "Cảm giác hưng phấn, thăng hoa rực rỡ." },
            { tag: "[Nostalgic]", desc: "Hoài niệm, nhớ nhung về quá khứ." },
            { tag: "[Dreamy]", desc: "Cảm giác như đang trong giấc mơ." },
            { tag: "[Sci-fi / Futuristic]", desc: "Âm hưởng khoa học viễn tưởng, tương lai." },
            { tag: "[Cyberpunk]", desc: "Gai góc, tối tăm kết hợp điện tử công nghệ cao." },
            { tag: "[Retro 80s]", desc: "Đậm chất thập niên 80 (Synthwave)." },
            // Audio FX
            { tag: "[Lo-Fi EQ]", desc: "Hiệu ứng âm thanh cũ, tần số bị cắt gọt như đài radio cũ." },
            { tag: "[Vinyl crackle]", desc: "Tiếng nổ lách tách của đĩa than cổ điển." },
            { tag: "[Tape flutter]", desc: "Hiệu ứng băng cassette cũ bị méo tiếng nhẹ." },
            { tag: "[Heavy reverb]", desc: "Hiệu ứng tiếng vang rất lớn (như hát trong hang động lớn)." },
            { tag: "[Cathedral reverb]", desc: "Tiếng vang cực sâu và dài như trong nhà thờ lớn." },
            { tag: "[Long decay]", desc: "Âm thanh ngân vang và nhỏ dần rất lâu sau khi đánh." },
            { tag: "[Delay]", desc: "Tiếng nhại (vọng lại nhiều lần)." },
            { tag: "[Ping-pong delay]", desc: "Tiếng vọng nảy qua lại giữa hai tai (trái - phải)." },
            { tag: "[Chorus effect]", desc: "Hiệu ứng làm âm thanh dày lên như nhiều người cùng hát/đàn." },
            { tag: "[Flanger / Phaser]", desc: "Hiệu ứng âm thanh uốn lượn, bay bổng như tiếng động cơ phản lực." },
            { tag: "[Bitcrusher]", desc: "Làm méo tiếng kiểu game 8-bit cũ." },
            { tag: "[8D Audio panning]", desc: "Âm thanh chạy vòng quanh đầu từ tai trái sang tai phải." },
            { tag: "[Submerged]", desc: "Âm thanh nghe như đang lặn dưới nước (tần số cao bị cắt hết)." },
            { tag: "[Distortion]", desc: "Làm vỡ và méo tiếng có chủ đích." },
            { tag: "[Reverse]", desc: "Âm thanh bị tua ngược." },
            // Foley / Ambience
            { tag: "[Rain ambience]", desc: "Tiếng mưa rơi làm nền." },
            { tag: "[Thunderstorms]", desc: "Tiếng sấm chớp ầm ầm." },
            { tag: "[Ocean waves]", desc: "Tiếng sóng biển vỗ rì rào." },
            { tag: "[Forest birds]", desc: "Tiếng chim hót trong rừng." },
            { tag: "[Night crickets]", desc: "Tiếng dế mưu đêm tĩnh mịch." },
            { tag: "[City traffic]", desc: "Tiếng ồn ào đường phố, còi xe." },
            { tag: "[Cafe chatter]", desc: "Tiếng người nói chuyện thì thầm trong quán cafe." },
            { tag: "[Heartbeat pulse]", desc: "Nhịp điệu mô phỏng tiếng tim đập dồn dập." },
            { tag: "[Clock ticking]", desc: "Tiếng đồng hồ tích tắc tạo sự căng thẳng về thời gian." }
        ]
    },
    {
        category: "5. Mẹo Mix/Master (Mixing Directions)",
        icon: <Settings className="w-4 h-4" />,
        items: [
            // Vocal Mix
            { tag: "[Dry vocal]", desc: "Giọng hát mộc, hoàn toàn không có tiếng vang." },
            { tag: "[Close-mic]", desc: "Cảm giác ca sĩ hát sát ngay vào micro, cực kỳ gần gũi." },
            { tag: "[Distant vocal]", desc: "Giọng hát nghe rất xa xăm, vang vẳng." },
            { tag: "[Muffled vocal]", desc: "Giọng hát bị nghẹt, không rõ lời." },
            { tag: "[Telephone EQ]", desc: "Giọng hát nghe như đang nói qua điện thoại." },
            { tag: "[Megaphone effect]", desc: "Giọng hát như đang nói qua loa cầm tay." },
            // Stereo Image
            { tag: "[Wide stereo]", desc: "Không gian âm thanh mở rộng tối đa ra hai bên tai." },
            { tag: "[Mono]", desc: "Âm thanh dồn hết vào chính giữa (cảm giác cổ điển)." },
            { tag: "[Hard panned left]", desc: "Âm thanh hoàn toàn nằm ở tai trái." },
            { tag: "[Hard panned right]", desc: "Âm thanh hoàn toàn nằm ở tai phải." },
            { tag: "[Swirling]", desc: "Âm thanh xoáy vòng quanh đầu." },
            // Frequency & Dynamics
            { tag: "[Bass boosted]", desc: "Tăng cường dải âm trầm." },
            { tag: "[Sub-heavy]", desc: "Dải siêu trầm cực mạnh, rung tai nghe." },
            { tag: "[Mid-scooped]", desc: "Cắt bỏ dải trung, âm thanh sắc lạnh (Metal)." },
            { tag: "[Bright mix]", desc: "Mix nhiều dải cao, âm thanh sắc nét, leng keng." },
            { tag: "[Warm mix]", desc: "Mix thiên về dải trung và trầm, âm thanh ấm áp, dễ chịu." },
            { tag: "[Wall of sound]", desc: "Kỹ thuật mix chồng hàng chục lớp âm thanh tạo thành bức tường âm thanh khổng lồ, dày đặc." },
            { tag: "[Sparse arrangement]", desc: "Phối khí cực kỳ thưa thớt, nhiều khoảng trống." },
            { tag: "[Heavily compressed]", desc: "Âm thanh bị nén rất chặt, mọi thứ đều to và rõ ràng." },
            { tag: "[Dynamic range]", desc: "Độ động cao, khác biệt lớn giữa đoạn nhỏ nhất và to nhất." },
            { tag: "[Sidechain pumping]", desc: "Hiệu ứng âm thanh ngụp lặn theo nhịp trống kick (EDM)." },
            { tag: "[Crystal clear production]", desc: "Chất lượng sản xuất trong trẻo, sắc nét, hiện đại." },
            { tag: "[Raw production]", desc: "Chất lượng sản xuất thô ráp, giữ nguyên lỗi nhỏ, cảm giác hát live." }
        ]
    }
];

export default function SunoGuideModal({ onClose }: { onClose: () => void }) {
    const [search, setSearch] = useState("");
    const [copiedTag, setCopiedTag] = useState<string | null>(null);

    const handleCopy = (tag: string) => {
        navigator.clipboard.writeText(tag);
        setCopiedTag(tag);
        setTimeout(() => setCopiedTag(null), 2000);
    };

    const filteredData = GUIDE_DATA.map(category => ({
        ...category,
        items: category.items.filter(item => 
            item.tag.toLowerCase().includes(search.toLowerCase()) || 
            item.desc.toLowerCase().includes(search.toLowerCase()) ||
            ((item as any).title && (item as any).title.toLowerCase().includes(search.toLowerCase()))
        )
    })).filter(category => category.items.length > 0);

    return (
        <div className="fixed inset-0 z-[999999] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200" onClick={onClose}>
            <div 
                className="w-full max-w-5xl max-h-[90vh] bg-[#1a1d24] border border-white/10 rounded-2xl shadow-2xl overflow-hidden flex flex-col"
                onClick={e => e.stopPropagation()}
            >
                {/* Header */}
                <div className="flex items-center justify-between p-4 border-b border-white/10 bg-white/5">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-purple-500/20 rounded-lg">
                            <BookOpen className="w-5 h-5 text-purple-400" />
                        </div>
                        <div>
                            <h2 className="text-lg font-black text-white uppercase tracking-wider">Từ Điển Thẻ Suno (Prompt Dictionary)</h2>
                            <p className="text-xs text-white/50 font-medium">Hàng trăm ví dụ giúp bạn làm chủ công cụ Phối Khí AI</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="p-2 bg-white/5 hover:bg-white/10 rounded-xl transition-colors">
                        <X className="w-5 h-5 text-white/70" />
                    </button>
                </div>

                {/* Search */}
                <div className="p-4 border-b border-white/5 bg-black/20">
                    <div className="relative">
                        <Search className="w-4 h-4 text-white/40 absolute left-3 top-1/2 -translate-y-1/2" />
                        <input 
                            type="text" 
                            placeholder="Tìm kiếm thẻ, nhạc cụ, hiệu ứng (vd: piano, reverb, lofi...)"
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            className="w-full bg-black/40 border border-white/10 rounded-xl pl-10 pr-4 py-2.5 text-sm text-white focus:outline-none focus:border-purple-500/50"
                        />
                    </div>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-4 sm:p-6 custom-scrollbar bg-[#0d0f14]">
                    {filteredData.length === 0 ? (
                        <div className="text-center text-white/40 py-10 font-medium">
                            Không tìm thấy kết quả nào cho "{search}"
                        </div>
                    ) : (
                        <div className="flex flex-col gap-8">
                            {filteredData.map((cat, idx) => (
                                <div key={idx} className="flex flex-col gap-4">
                                    <h3 className="text-sm font-black text-purple-400 uppercase tracking-widest flex items-center gap-2 border-b border-purple-500/20 pb-2 sticky top-0 bg-[#0d0f14] z-10 pt-2">
                                        {cat.icon}
                                        {cat.category}
                                    </h3>
                                    
                                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                                        {cat.items.map((item, iIdx) => {
                                            if ((item as any).isTemplate) {
                                                return (
                                                    <div key={iIdx} className="col-span-1 md:col-span-2 lg:col-span-3 bg-black/40 border border-purple-500/30 rounded-xl overflow-hidden flex flex-col group">
                                                        <div className="bg-purple-900/20 p-3 border-b border-purple-500/20 flex items-center justify-between">
                                                            <div>
                                                                <div className="font-bold text-sm text-purple-300">{(item as any).title}</div>
                                                                <div className="text-[11px] text-white/50 mt-0.5">{item.desc}</div>
                                                            </div>
                                                            <button 
                                                                onClick={() => handleCopy(item.tag)}
                                                                className="flex items-center gap-1.5 bg-purple-600 hover:bg-purple-500 text-white px-3 py-1.5 rounded-lg text-xs font-bold uppercase transition-colors shrink-0"
                                                            >
                                                                {copiedTag === item.tag ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                                                                {copiedTag === item.tag ? "Đã Copy" : "Copy Template"}
                                                            </button>
                                                        </div>
                                                        <div className="p-4 overflow-x-auto">
                                                            <pre className="text-[11px] text-emerald-400 font-mono leading-relaxed whitespace-pre-wrap">
                                                                {item.tag}
                                                            </pre>
                                                        </div>
                                                    </div>
                                                );
                                            }

                                            return (
                                                <div 
                                                    key={iIdx} 
                                                    className="bg-white/5 hover:bg-white/10 border border-white/5 hover:border-purple-500/30 rounded-lg p-3 transition-colors group cursor-pointer relative" 
                                                    onClick={() => handleCopy(item.tag)}
                                                >
                                                    <div className="flex items-start justify-between mb-1.5 gap-2">
                                                        <span className="font-mono text-[12px] font-bold text-emerald-400 break-all">{item.tag}</span>
                                                        <div className="shrink-0 flex items-center justify-center p-1 rounded bg-white/5 group-hover:bg-purple-500/20 text-white/30 group-hover:text-purple-400 transition-colors">
                                                            {copiedTag === item.tag ? <Check className="w-3.5 h-3.5 text-green-400" /> : <Copy className="w-3.5 h-3.5" />}
                                                        </div>
                                                    </div>
                                                    <p className="text-[11px] text-white/60 leading-relaxed pr-6">{item.desc}</p>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
