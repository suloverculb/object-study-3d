# Three.js 實作與驗證

## 技術基準與責任

- Vite + JavaScript ES modules + Three.js；本次凍結基準為 Three.js `0.180.0`、Vite `7.1.12`。這是可重現版本，後續以目標應用的 lockfile 為準。
- [main.js](../assets/baseline/src/main.js)：renderer、攝影機、照明、OrbitControls、模式切換、滑桿、鍵盤、尺寸及資源釋放。
- [fruit.js](../assets/baseline/src/fruit.js)：物件工廠、程序化幾何、貼圖、材質與熟度變色。製作其他物品時替換這個模型模組和相應事件。
- [package.json](../assets/baseline/package.json) 和 [package-lock.json](../assets/baseline/package-lock.json)：開發、建置與依賴。

保留現有結構即可完成單一物件展示。多物件確實共享同一頁面時，再抽取模型介面和觀察模式資料；不要為了重用外觀先改寫成大型框架。

## 場景與互動起點

| 項目 | 基準設定 |
| --- | --- |
| Renderer | `antialias: true`、`alpha: true`、像素比上限 2 |
| 色彩 | `SRGBColorSpace`、`ACESFilmicToneMapping`、曝光 0.95 |
| 環境 | `RoomEnvironment` 經 PMREM，強度 0.65 |
| 補光 | 暖色主光、淡綠輪廓光、柔和半球光 |
| 攝影機 | `PerspectiveCamera`，桌面 FOV 32°，狹長畫布 43° |
| OrbitControls | 阻尼 0.075、停用平移、自動旋轉預設關閉、速度 0.65 |
| 輸入 | 拖曳／單指旋轉、滾輪／雙指縮放、方向鍵旋轉、`+/-` 縮放、`0` 重設 |

光源位置、攝影機距離與縮放界限是起點，依物件的包圍盒、厚度及主觀察方向調整。整體模式與切面／打開模式可以有各自的 home position；重設應回到當前模式的預設視角。

使用 `ResizeObserver` 讀取容器大小，更新 renderer 與攝影機投影。由父容器控制 canvas 尺寸，避免 resize 回饋迴圈。手動操作停止自動旋轉；按鈕的可見文字、狀態與無障礙名稱保持同步。

保留載入狀態、WebGL 初始化失敗訊息及 context lost/restored 處理。頁面隱藏時略過繪製；退出時釋放 controls、observer、geometry、material、texture、環境圖與 renderer，共用資源以 Set 去重。

## 幾何與材質判斷

先讓輪廓和比例可信，再處理材質。依參考選用參數曲面、放樣、車削、擠出或組合幾何。天然物件可以有可重現的低幅不對稱與翹曲，工業製品則保留實際對稱和加工邊緣。

封閉模型的前後面、厚度與側壁要正確；檢查背面法線、UV 接縫與遮擋。果皮若與切面果肉分離，使用中空外圈，避免實心果皮蓋住果肉表面的起伏。

貼圖按其資料角色設定 color space：色彩貼圖用 SRGB，法線、粗糙度及遮罩用 NoColorSpace。程序化紋理採確定性種子，維持可重現；確保 UV 下的紋理尺寸在預覽中可見。

### 遇到濕潤果肉時

這是本次楊桃的材質經驗，適用於果肉、汁液等相應部分：

- 用柔和色差表達細胞，主要細節來自微小法線和粗糙度；過強的斑點與 bump 容易呈現乾燥、海綿感。
- 用 `MeshPhysicalMaterial` 的 transmission、厚度與暖色 attenuation 呈現半透明，保留密集中央纖維的較高不透明度。
- 局部汁液薄膜使用 clearcoat coverage、roughness 和 clearcoat normal 貼圖。碎亮由光線與視角產生，避免把固定白點畫在 diffuse map 上。
- 均勻、過強的清漆會像塑膠；過密過白的微高光會像砂糖。調整覆蓋率、法線幅度、粗糙度和主光，確認有清晰的果肉色與局部光澤。

楊桃基準的起點為 roughness `0.4 × map`、normalScale `0.48`、clearcoat `0.7 × coverage`、clearcoatRoughness `0.22 × map`、clearcoatNormalScale `0.9`、transmission `0.48 × map`、thickness `0.4`、IOR `1.34`，暖黃色衰減距離 `0.9`。數值與模型尺度、照明綁定，不當作其他材質的通用預設。

### 修改 shader 時

基準使用 `onBeforeCompile` 結合中央纖維與透射遮罩。改動 shader 字串時，檢查已安裝 Three.js 的實際 `ShaderChunk`，維持自訂 `customProgramCacheKey` 與程式變化一致。前後面都需檢查；`npm run build` 成功無法證明 GLSL 在瀏覽器可編譯。

## 可重現的驗證

使用當前環境可用的瀏覽器工具檢查實際 WebGL 畫面。使用 Playwright CLI 時遵循可用 skill；不硬編碼本機快取中的瀏覽器執行檔路徑到新應用。

1. 依目標 lockfile 安裝／沿用依賴，執行 `npm run dev`，使用終端回報的實際網址。先確認既有預覽是否可用，避免重複啟動服務。
2. 查看初次載入及所有觀察模式。截取桌面、手機、側面與背面；檢查完整輪廓、邊緣厚度、接縫、透光、紋理尺寸及隨視角改變的反光。
3. 驗證拖曳旋轉、滾輪縮放、自動旋轉開始／暫停、模式與重設、鍵盤操作、參數控制的兩端；參數應改變模型或材質，不能只有文字改變。
4. 按下方「視窗高度與捲動檢查」驗證桌面、寬螢幕與手機，量測頁面高度及水平、垂直溢出，確認模型完整可見、工具列可操作。等待字型與 CSS 狀態過渡完成再截最終圖。
5. 確認 console 無執行階段與 shader 錯誤，執行 `npm run build`。依改動保留必要的驗證，避免為低影響文案／間距改動新增冗餘測試。
6. 將截圖放於目標展示的 `output/playwright/` 或等效忽略目錄，完成回報中提供實際預覽網址與有用的最終視覺。

### 視窗高度與捲動檢查

以下尺寸皆為瀏覽器 viewport 的 CSS 像素；新展示及影響版面高度的修改，至少涵蓋這些情境：

| 情境 | 視窗寬 × 高 |
| --- | --- |
| 一般桌面 | 1280×800 |
| 原寬螢幕斷點兩側 | 1599×900、1600×900 |
| 寬而矮的視窗 | 1920×720、1920×900 |
| 大螢幕與超寬螢幕 | 1920×1080、2560×1440、3440×1440 |
| 手機 | 390×844、375×667 |

若新增其他排版斷點，補查該斷點兩側。等待 `document.fonts.ready`、尺寸更新與 CSS 過渡完成，在所有觀察模式檢查：

- `document.documentElement.scrollHeight <= window.innerHeight`，且 `scrollWidth <= window.innerWidth`，確認沒有水平或垂直捲動範圍。
- `.app` 的高度與視窗高度相等，允許 1px 的次像素量測誤差；頁首及頁尾工具列的邊界都在視窗內。
- 物品名稱、參數控制、模式標籤及操作提示均在可見範圍內；介紹欄不侵入頁首或工具列。截圖確認模型完整，避免只有外層尺寸符合、內容卻被裁切。
- 改變視窗尺寸後，Three.js renderer 與攝影機比例隨容器更新，且模式切換、旋轉與縮放仍可操作。

發現溢出時依 [高度配置](design-system.md) 調整容器、留白與文案，修正後重查失敗情境與受影響的模式。
