import { useState, type CSSProperties } from 'react'
import {
  ArrowDownToLine,
  ArrowLeft,
  ArrowRight,
  Brush,
  Check,
  ChevronDown,
  Circle,
  Eraser,
  FolderOpen,
  Layers,
  PaintBucket,
  Redo2,
  Save,
  SlidersHorizontal,
  Sparkles,
  Square,
  Undo2,
  Waves,
} from 'lucide-react'
import { HslColorPicker, type HslColor } from 'react-colorful'
import artwork from './assets/canvas-art.svg'
import './App.css'

const palette = [
  '#1d9a95', '#f3e99b', '#a8c987', '#398773', '#767b51', '#527b72',
  '#82745d', '#527fa7', '#469ec0', '#168f98', '#93cdb8', '#f2d875',
  '#e5d53d', '#e7a52f', '#e87835', '#d84f42', '#ee8974', '#f3a18a',
  '#e87860', '#cf392c', '#8d3e35', '#873b71', '#777a80', '#111318',
]

const brushShapes = [
  { id: 'round', label: '丸筆', Icon: Circle },
  { id: 'flat', label: '平筆', Icon: Brush },
  { id: 'square', label: '四角筆', Icon: Square },
] as const

const paintTypes = [
  { id: 'normal', label: 'ノーマル', Icon: Brush },
  { id: 'oil', label: '油彩', Icon: Sparkles },
  { id: 'watercolor', label: '水彩', Icon: Waves },
] as const

function hexToHsl(hex: string): HslColor {
  const red = parseInt(hex.slice(1, 3), 16) / 255
  const green = parseInt(hex.slice(3, 5), 16) / 255
  const blue = parseInt(hex.slice(5, 7), 16) / 255
  const max = Math.max(red, green, blue)
  const min = Math.min(red, green, blue)
  const delta = max - min
  let hue = 0
  let saturation = 0
  const lightness = (max + min) / 2

  if (delta !== 0) {
    saturation = delta / (1 - Math.abs(2 * lightness - 1))
    switch (max) {
      case red:
        hue = ((green - blue) / delta) % 6
        break
      case green:
        hue = (blue - red) / delta + 2
        break
      default:
        hue = (red - green) / delta + 4
    }
    hue *= 60
    if (hue < 0) hue += 360
  }

  return { h: hue, s: saturation * 100, l: lightness * 100 }
}

function hslToHex({ h, s, l }: HslColor) {
  const saturation = s / 100
  const lightness = l / 100
  const chroma = (1 - Math.abs(2 * lightness - 1)) * saturation
  const section = h / 60
  const x = chroma * (1 - Math.abs((section % 2) - 1))
  const [red, green, blue] =
    section < 1 ? [chroma, x, 0] :
      section < 2 ? [x, chroma, 0] :
        section < 3 ? [0, chroma, x] :
          section < 4 ? [0, x, chroma] :
            section < 5 ? [x, 0, chroma] : [chroma, 0, x]
  const offset = lightness - chroma / 2
  return `#${[red, green, blue].map((channel) =>
    Math.round((channel + offset) * 255).toString(16).padStart(2, '0'),
  ).join('')}`
}

function App() {
  const [color, setColor] = useState<HslColor>(() => hexToHsl('#168f98'))
  const [selectedPalette, setSelectedPalette] = useState(9)
  const [brushShape, setBrushShape] = useState<string>('round')
  const [paintType, setPaintType] = useState<string>('oil')
  const [brushSize, setBrushSize] = useState(30)
  const [eraserEnabled, setEraserEnabled] = useState(false)

  const currentHex = hslToHex(color)

  function choosePalette(hex: string, index: number) {
    setSelectedPalette(index)
    setColor(hexToHsl(hex))
  }

  function updateColor(nextColor: HslColor) {
    setColor(nextColor)
  }

  return (
    <div className="app-shell">
      <header className="topbar">
        <a className="brand" href="#" aria-label="WebPainter ホーム">
          <span className="brand-mark"><Sparkles size={18} /></span>
          <span>web<span>painter</span></span>
        </a>
        <div className="document-title">
          <span className="document-dot" />
          <span>Starry night study</span>
          <ChevronDown size={15} />
        </div>
        <div className="topbar-actions">
          <span className="saved-status"><span /> すべて保存済み</span>
          <button className="topbar-button" aria-label="保存"><Save size={16} /><span>保存</span></button>
          <button className="export-button"><ArrowDownToLine size={16} /><span>書き出す</span></button>
          <button className="avatar" aria-label="プロフィール">Y</button>
        </div>
      </header>

      <main className="workspace">
        <aside className="panel tools-panel">
          <div className="panel-heading">
            <div>
              <span className="eyebrow">TOOLS</span>
              <h2>ペイントツール</h2>
            </div>
            <button className="icon-button subtle-button" aria-label="設定"><SlidersHorizontal size={17} /></button>
          </div>

          <section className="control-section">
            <div className="section-title">ブラシ形状</div>
            <div className="choice-row shape-row">
              {brushShapes.map(({ id, label, Icon }) => (
                <button
                  key={id}
                  className={`tool-choice ${brushShape === id ? 'selected' : ''}`}
                  onClick={() => setBrushShape(id)}
                  aria-label={label}
                  aria-pressed={brushShape === id}
                  title={label}
                >
                  <Icon size={20} strokeWidth={1.8} />
                  <span>{label}</span>
                </button>
              ))}
            </div>
          </section>

          <section className="control-section">
            <div className="section-title">ペイントタイプ</div>
            <div className="choice-row paint-row">
              {paintTypes.map(({ id, label, Icon }) => (
                <button
                  key={id}
                  className={`tool-choice ${paintType === id ? 'selected' : ''}`}
                  onClick={() => setPaintType(id)}
                  aria-pressed={paintType === id}
                >
                  <Icon size={19} strokeWidth={1.8} />
                  <span>{label}</span>
                </button>
              ))}
            </div>
          </section>

          <button
            className={`eraser-toggle ${eraserEnabled ? 'is-on' : ''}`}
            onClick={() => setEraserEnabled(!eraserEnabled)}
            aria-pressed={eraserEnabled}
          >
            <Eraser size={18} />
            <span>消しゴム</span>
            <span className={`toggle-track ${eraserEnabled ? 'checked' : ''}`}><span /></span>
          </button>

          <div className="history-buttons">
            <button className="action-tile" aria-label="元に戻す">
              <Undo2 size={20} /><span>元に戻す</span>
            </button>
            <button className="action-tile" aria-label="やり直す">
              <Redo2 size={20} /><span>やり直す</span>
            </button>
          </div>

          <div className="file-buttons">
            <button className="action-tile" aria-label="保存">
              <Save size={19} /><span>保存</span>
            </button>
            <button className="action-tile" aria-label="読み込み">
              <FolderOpen size={19} /><span>読み込み</span>
            </button>
          </div>

          <div className="panel-footer">
            <span className="status-indicator" />
            キャンバスは自動保存されます
          </div>
        </aside>

        <section className="canvas-workspace" aria-label="キャンバス">
          <div className="canvas-toolbar">
            <div className="canvas-meta">
              <span className="canvas-meta-icon"><Layers size={15} /></span>
              <span>キャンバス</span>
              <span className="meta-divider" />
              <strong>1024 × 1024</strong>
              <span className="ratio-badge">1:1</span>
            </div>
            <div className="canvas-zoom">
              <button aria-label="前の表示"><ArrowLeft size={15} /></button>
              <span>100%</span>
              <button aria-label="次の表示"><ArrowRight size={15} /></button>
            </div>
          </div>
          <div className="canvas-stage">
            <div className="canvas-frame">
              <img src={artwork} alt="青い夜空と丘の風景を描いたキャンバスのプレビュー" />
            </div>
            <span className="canvas-dimension dimension-top">1024 px</span>
            <span className="canvas-dimension dimension-bottom">1024 px</span>
          </div>
          <div className="canvas-statusbar">
            <span><span className="live-dot" /> キャンバス準備完了</span>
            <span>X: 512 &nbsp; Y: 512</span>
          </div>
        </section>

        <aside className="panel color-panel">
          <div className="panel-heading color-heading">
            <div>
              <span className="eyebrow">COLOR &amp; SETTINGS</span>
              <h2>カラーと設定</h2>
            </div>
            <button className="icon-button subtle-button" aria-label="カラー設定"><PaintBucket size={17} /></button>
          </div>

          <section className="color-section">
            <div className="section-title">カラーピッカー</div>
            <div className="color-wheel-wrap">
              <HslColorPicker color={color} onChange={updateColor} />
            </div>
            <div className="active-color-row">
              <span className="active-swatch" style={{ backgroundColor: currentHex }} />
              <span>選択中の色</span>
              <code>{currentHex.toUpperCase()}</code>
            </div>
          </section>

          <section className="palette-section">
            <div className="section-title">カラーパレット <span>24色</span></div>
            <div className="palette-grid">
              {palette.map((hex, index) => (
                <button
                  key={`${hex}-${index}`}
                  className={`palette-swatch ${selectedPalette === index ? 'active' : ''}`}
                  style={{ backgroundColor: selectedPalette === index ? currentHex : hex }}
                  onClick={() => choosePalette(hex, index)}
                  aria-label={`色 ${selectedPalette === index ? currentHex : hex}`}
                  aria-pressed={selectedPalette === index}
                >
                  {selectedPalette === index && <Check size={13} />}
                </button>
              ))}
            </div>
          </section>

          <section className="brush-size-section">
            <div className="brush-size-heading">
              <div className="section-title">ブラシサイズ</div>
              <output>{brushSize}<span> px</span></output>
            </div>
            <input
              type="range"
              min="1"
              max="100"
              value={brushSize}
              onChange={(event) => setBrushSize(Number(event.target.value))}
              aria-label="ブラシサイズ"
              style={{ '--range-progress': `${brushSize}%` } as CSSProperties}
            />
            <div className="range-labels"><span>1 px</span><span>100 px</span></div>
          </section>
        </aside>
      </main>

      <footer className="app-footer">
        <span>WebPainter <span className="footer-separator">/</span> 新しい作品</span>
        <span>作品はこのデバイスに保存されます</span>
      </footer>
    </div>
  )
}

export default App
