const fs = require('fs');
let content = fs.readFileSync('src/App.tsx', 'utf8');

const target = `      } catch (err: any) {
        console.error(err);
        setStemmixError(err.message);
        setStemmixStatus("error");
      }`;

const replacement = `      } catch (err: any) {
        console.error(err);
        if (stemmixMode === "cloud" && (err.message || "").includes("AI Cloud servers")) {
           console.log("Auto-falling back to WebGPU DSP...");
           setStemmixMode("webgpu");
           setTimeout(() => {
              const btn = document.getElementById("start-separation-btn");
              if (btn) btn.click();
           }, 500);
           setStemmixError("AI Cloud servers offline. Auto-switched to WebGPU DSP.");
           setStemmixStatus("idle");
        } else {
           setStemmixError(err.message);
           setStemmixStatus("error");
        }
      }`;

content = content.replace(target, replacement);

const btnTarget = `<Button onClick={handleCreateStems}`;
const btnReplacement = `<Button id="start-separation-btn" onClick={handleCreateStems}`;
content = content.replace(btnTarget, btnReplacement);

fs.writeFileSync('src/App.tsx', content);
