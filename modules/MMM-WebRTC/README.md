# MMM-WebRTC

这是一个 MagicMirror² 模块，用于实现基于 WebRTC 的视频流功能。该模块使用标准的 Web API，无需额外依赖。

## 安装

1. 进入 MagicMirror 的 modules 目录：
```bash
cd ~/MagicMirror/modules
```

2. 克隆此仓库：
```bash
git clone https://github.com/CY-CHENYUE/Coze-MM/tree/main/modules/MMM-WebRTC
```

## 配置

将以下配置添加到 MagicMirror 的 `config/config.js` 文件中：

```javascript
{
    module: "MMM-WebRTC",
    position: "top_right",
    config: {
        width: "320px",
        height: "240px",
        autoStart: true
    }
}
```

### 配置选项

| 选项 | 描述 | 默认值 |
|------|------|--------|
| `width` | 视频宽度 | "320px" |
| `height` | 视频高度 | "240px" |
| `autoStart` | 是否自动启动视频 | true |

## 依赖

本模块使用标准 Web API（WebRTC），无需额外依赖。

## 注意事项

- 需要浏览器支持 WebRTC
- 需要允许访问摄像头权限
- 建议使用现代浏览器（如 Chrome）以获得最佳体验 