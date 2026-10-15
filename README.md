# object-study-3d — 立體物件研究室

用於 Codex 的 Three.js 互動物品展示 skill。沿用奶油白背景、深綠文字與圖鑑式排版，製作可旋轉、縮放的水果或其他物品，並依物品提供完整／切面等觀察模式。

展示頁須填滿瀏覽器視窗，模型、文字與工具列完整可見，且不出現水平或垂直捲軸。包含一般桌面、寬而矮的視窗、超寬螢幕及手機的驗證規格。

## 安裝到自己的專案

將此儲存庫放到目標專案的 `.agents/skills/object-study-3d/`。例如在專案根目錄執行：

```sh
git clone https://github.com/suloverculb/object-study-3d.git .agents/skills/object-study-3d
```

安裝後在該專案的 Codex 對話中使用：

```text
使用 $object-study-3d，製作一顆檸檬，沿用圖鑑風格排版，加入完整果實與切面模式，畫面要填滿視窗。
```

也可用於陶杯、岩石等物品，材質與可調參數依物品決定。

## 內容

```text
SKILL.md                    skill 指示與完成條件
agents/openai.yaml          Codex 顯示名稱與預設提示
references/design-system.md 排版、色彩及視窗高度規格
references/three-workflow.md 建模、材質、互動及驗證流程
assets/baseline/             可複製的 Vite + Three.js 原始碼基準
```

基準使用 Three.js 0.180.0 與 Vite 7.1.12，包含由程式建立的楊桃模型與程序化材質。基準的物品內容、文案與圖示供替換；新物品的修改應放在目標專案的獨立展示目錄。

## 試跑原始碼基準

需要 Node.js 20.19+ 或 22.12+：

```sh
cd assets/baseline
npm ci
npm run dev
```

使用終端回報的本機網址；`npm run build` 會產生可部署的 `dist/`。

## 圖片範圍

此分享版本不包含參考照片、預覽截圖或其他點陣圖片檔，也不依賴原專案的圖片路徑。幾何、果皮與果肉貼圖由程式產生；頁面小圖示使用程式碼內的向量路徑。

若製作新物品時需要照片，請自行提供有權使用的參考資料。Google Fonts 為選用字型，離線時使用系統後備字型。
