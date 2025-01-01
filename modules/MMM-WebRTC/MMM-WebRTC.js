Module.register("MMM-WebRTC", {
    defaults: {
        autoStart: true,
        coze: {
            botId: "",
            voiceId: "",
            baseURL: "https://api.coze.cn",
            accessToken: ""
        },
        suppressStationaryNoise: true,
        suppressNonStationaryNoise: true,
        debug: true,
        allowPersonalAccessTokenInBrowser: true,
        audioMutedDefault: false,
        connectorId: "1024",
        refreshTokenInterval: 150000, // 150秒，确保在token过期前刷新
        vadOptions: {
            enabled: true,           // 是否启用 VAD
            silenceThreshold: -50,   // 静音阈值（dB）
            voiceThreshold: -35,     // 语音阈值（dB）
            silenceDuration: 1000,   // 静音持续时间（毫秒）
            autoStart: true          // 是否自动开始监听
        }
    },

    requiresVersion: "2.1.0",

    getScripts: function() {
        Log.info("MMM-WebRTC: Loading scripts...");
        // 添加 webpack 所需的全局变量
        if (typeof self === 'undefined') {
            window.self = window;
        }
        if (typeof global === 'undefined') {
            window.global = window;
        }
        return [
            "/modules/MMM-WebRTC/public/coze-realtime-api.js"
        ];
    },

    getStyles: function() {
        return ["MMM-WebRTC.css"];
    },

    start: function() {
        Log.info("MMM-WebRTC: Starting module...");
        this.isListening = false;
        this.client = null;
        this.events = [];
        this.serverEvents = [];
        this.audioDevices = {
            inputs: [],
            outputs: []
        };
        this.selectedAudioInput = 'default';
        this.selectedAudioOutput = 'default';
        this.isSpeaking = false;
        this.silenceTimer = null;
        this.audioInitialized = false;

        // 直接检查 SDK，不预先初始化音频
        this.checkSDK();
    },

    checkSDK: function() {
        Log.info("MMM-WebRTC: Checking SDK availability...");
        const checkSDKAvailability = () => {
            try {
                // 检查所有可能的全局变量名
                const sdk = self.CozeRealtimeApi || window.CozeRealtimeApi;
                if (sdk) {
                    Log.info("MMM-WebRTC: SDK loaded successfully");
                    if (typeof sdk.RealtimeClient !== 'function') {
                        Log.error("MMM-WebRTC: Invalid SDK format, available properties:", Object.keys(sdk));
                        setTimeout(checkSDKAvailability, 2000);
                        return;
                    }
                    this.RealtimeClient = sdk.RealtimeClient;
                    this.EventNames = sdk.EventNames;
                    this.initClient();
                } else {
                    Log.info("MMM-WebRTC: SDK not loaded yet, available globals:", 
                        Object.keys(self).filter(key => key.includes('Coze')),
                        Object.keys(window).filter(key => key.includes('Coze'))
                    );
                    setTimeout(checkSDKAvailability, 2000);
                }
            } catch (error) {
                Log.error("MMM-WebRTC: Error checking SDK:", error);
                setTimeout(checkSDKAvailability, 2000);
            }
        };

        // 延迟启动检查，确保页面完全加载
        setTimeout(checkSDKAvailability, 1000);
    },

    initClient: function() {
        try {
            Log.info("MMM-WebRTC: Initializing client...");
            
            // 创建客户端实例
            this.client = new this.RealtimeClient({
                accessToken: () => this.config.coze.accessToken,
                botId: this.config.coze.botId,
                voiceId: this.config.coze.voiceId,
                debug: this.config.debug,
                baseURL: this.config.coze.baseURL,
                allowPersonalAccessTokenInBrowser: true,
                audioMutedDefault: this.config.audioMutedDefault,
                suppressStationaryNoise: this.config.suppressStationaryNoise,
                suppressNonStationaryNoise: this.config.suppressNonStationaryNoise,
                connectorId: this.config.connectorId,
                audioConfig: {
                    captureDeviceId: this.selectedAudioInput,
                    playbackDeviceId: this.selectedAudioOutput,
                    agc: true,
                    aec: true,
                    ans: true
                }
            });

            // 订阅所有事件
            this.client.on(this.EventNames.ALL, (eventName, data) => {
                this.handleAllMessage(eventName, data);
            });

            // 特别监听错误事件
            this.client.on('error', (error) => {
                Log.error("MMM-WebRTC: Client error:", error);
            });

            // 监听音频电平
            this.client.on('client.audio.level', (level) => {
                if (this.config.vadOptions.enabled) {
                    this.handleVoiceLevel(level);
                }
            });

            // 连接服务器
            this.connect();
        } catch (error) {
            Log.error("MMM-WebRTC: Failed to initialize client:", error);
            setTimeout(() => this.initClient(), 5000);
        }
    },

    handleVoiceLevel: function(level) {
        if (!this.config.vadOptions.enabled) return;

        // 检测是否有语音
        const isVoiceDetected = level > this.config.vadOptions.voiceThreshold;
        const voiceAnimation = document.querySelector(".voice-animation");
        
        if (isVoiceDetected && !this.isSpeaking) {
            // 检测到语音开始
            Log.info("MMM-WebRTC: Voice detected, starting audio...");
            this.isSpeaking = true;
            this.startListening();
            if (voiceAnimation) {
                voiceAnimation.classList.add("active");
                // 立即更新动画效果
                this.updateVoiceAnimation(level);
            }
        } else if (!isVoiceDetected && this.isSpeaking) {
            // 检测到可能的静音
            if (!this.silenceTimer) {
                this.silenceTimer = setTimeout(() => {
                    // 持续静音，停止录音
                    Log.info("MMM-WebRTC: Silence detected, stopping audio...");
                    this.isSpeaking = false;
                    this.stopListening();
                    if (voiceAnimation) {
                        voiceAnimation.classList.remove("active");
                    }
                    this.silenceTimer = null;
                }, this.config.vadOptions.silenceDuration);
            }
        } else if (isVoiceDetected && this.isSpeaking && this.silenceTimer) {
            // 在静音期间又检测到语音，取消静音计时器
            clearTimeout(this.silenceTimer);
            this.silenceTimer = null;
        }

        // 更新动画效果
        if (this.isSpeaking) {
            this.updateVoiceAnimation(level);
        }
    },

    updateVoiceAnimation: function(level) {
        const voiceAnimation = document.querySelector(".voice-animation");
        if (!voiceAnimation) return;

        const bars = voiceAnimation.querySelectorAll(".voice-bar");
        if (!bars.length) return;

        // 将电平值归一化到0.3-1范围
        const normalizedLevel = Math.max(0.3, Math.min(1, (level + 100) / 50));
        
        // 为每个bar设置不同的缩放值，创造波浪效果
        bars.forEach((bar, index) => {
            const scale = normalizedLevel * (0.7 + Math.sin(Date.now() / 200 + index) * 0.3);
            bar.style.transform = `scaleY(${scale})`;
        });
    },

    connect: async function() {
        try {
            Log.info("MMM-WebRTC: Connecting to server...");
            await this.client.connect();
            Log.info("MMM-WebRTC: Connected successfully");
            
            // 更新状态
            const status = document.getElementById("webrtc-status");
            if (status) status.textContent = "已连接";
            const indicator = document.querySelector(".audio-indicator");
            if (indicator) indicator.classList.add("active");

            // 设置定时刷新 token
            this.tokenRefreshInterval = setInterval(
                () => this.refreshToken(),
                this.config.refreshTokenInterval
            );

            // 如果配置了自动开始，启用音频属性报告
            if (this.config.vadOptions.enabled && this.config.vadOptions.autoStart) {
                await this.client.enableAudioPropertiesReport({
                    interval: 100, // 更频繁的检查
                    enableVad: true,
                    enableVolume: true
                });
            }
        } catch (error) {
            Log.error("MMM-WebRTC: Failed to connect:", error);
            setTimeout(() => this.connect(), 5000);
        }
    },

    handleAllMessage: function(eventName, data) {
        const type = eventName.split('.')[0];
        const event = eventName.substring(eventName.indexOf('.') + 1);

        // 只处理服务器消息
        if (type === 'server') {
            // 只显示用户和助手的对话内容
            if (data?.data?.role === 'user' || data?.data?.role === 'assistant') {
                const messages = document.getElementById("messages");
                if (messages) {
                    // 如果是新的完整消息，清理旧消息
                    if (event === 'message.received' || event === 'message.sent') {
                        while (messages.firstChild) {
                            messages.removeChild(messages.firstChild);
                        }
                    }

                    // 只显示有效的文本内容
                    if (data?.data?.content && 
                        !data?.data?.content.includes('{"finish_reason":0') && 
                        !data?.data?.content.includes('{"msg_type":')) {
                        
                        // 如果已经存在相同角色的消息，更新内容
                        let messageDiv = messages.querySelector(`.message.${data?.data?.role}`);
                        if (!messageDiv) {
                            messageDiv = document.createElement("div");
                            messageDiv.className = `message ${data?.data?.role}`;
                            messageDiv.setAttribute('data-event', event);
                            messages.appendChild(messageDiv);
                            messageDiv.classList.add('show');
                        }
                        
                        // 更新消息内容
                        messageDiv.textContent = data?.data?.content;
                        
                        // 清除之前的淡出定时器
                        if (messageDiv.fadeOutTimer) {
                            clearTimeout(messageDiv.fadeOutTimer);
                        }
                        
                        // 10秒后开始淡出
                        messageDiv.fadeOutTimer = setTimeout(() => {
                            messageDiv.style.transition = 'opacity 1s ease';
                            messageDiv.style.opacity = '0';
                            setTimeout(() => {
                                if (messageDiv.parentNode === messages) {
                                    messages.removeChild(messageDiv);
                                }
                            }, 1000);
                        }, 10000);
                    }
                }
            }
        }
    },

    async refreshToken() {
        try {
            Log.info("MMM-WebRTC: Refreshing token...");
            // 调用创建房间接口获取新的 token
            const response = await fetch(`${this.config.coze.baseURL}/api/realtime/room/create`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${this.config.coze.accessToken}`
                },
                body: JSON.stringify({
                    botId: this.config.coze.botId
                })
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const data = await response.json();
            // 更新 token
            if (this.client) {
                await this.client.updateToken(data.token);
                Log.info("MMM-WebRTC: Token refreshed successfully");
            }
        } catch (error) {
            Log.error("MMM-WebRTC: Failed to refresh token:", error);
        }
    },

    async startListening() {
        if (!this.client || this.isListening) return;

        try {
            Log.info("MMM-WebRTC: Starting audio...");
            
            // 1. 确保 AudioContext 已初始化
            if (!this.audioContext) {
                this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
                // 等待用户交互
                if (this.audioContext.state === 'suspended') {
                    await this.audioContext.resume();
                }
                Log.info("MMM-WebRTC: AudioContext initialized successfully");
            }
            
            // 2. 获取音频流
            const stream = await navigator.mediaDevices.getUserMedia({ 
                audio: {
                    echoCancellation: false,
                    noiseSuppression: false,
                    autoGainControl: false
                } 
            });
            
            // 保存流的引用
            this.audioStream = stream;
            
            // 3. 设置监听状态
            this.isListening = true;

            // 4. 启用音频
            await this.client.setAudioEnable(true);
            
            // 5. 启用音频属性报告
            await this.client.enableAudioPropertiesReport({
                interval: 100,
                enableVad: true,
                enableVolume: true
            });

            const button = document.querySelector(".voice-button");
            if (button) button.textContent = "正在录音...";
            Log.info("MMM-WebRTC: Audio started");

            // 更新指示器
            const indicator = document.querySelector(".audio-indicator");
            if (indicator) indicator.classList.add("active");
        } catch (error) {
            Log.error("MMM-WebRTC: Failed to start listening:", error);
            this.isListening = false;
            
            // 清理资源
            if (this.audioStream) {
                this.audioStream.getTracks().forEach(track => track.stop());
                this.audioStream = null;
            }
            
            const button = document.querySelector(".voice-button");
            if (button) button.textContent = "按住说话";
        }
    },

    async stopListening() {
        if (!this.client || !this.isListening) return;

        try {
            Log.info("MMM-WebRTC: Stopping audio...");
            
            // 1. 停止音频流
            if (this.audioStream) {
                this.audioStream.getTracks().forEach(track => track.stop());
                this.audioStream = null;
            }
            
            // 2. 禁用音频属性报告
            await this.client.enableAudioPropertiesReport({
                interval: 0,
                enableVad: false,
                enableVolume: false
            });
            
            // 3. 禁用音频
            await this.client.setAudioEnable(false);
            
            const button = document.querySelector(".voice-button");
            if (button) button.textContent = "按住说话";
            this.isListening = false;
            Log.info("MMM-WebRTC: Audio stopped");

            // 更新指示器
            const indicator = document.querySelector(".audio-indicator");
            if (indicator) indicator.classList.remove("active");
        } catch (error) {
            Log.error("MMM-WebRTC: Failed to stop listening:", error);
        }
    },

    getDom: function() {
        Log.info("MMM-WebRTC: Creating DOM elements...");
        const wrapper = document.createElement("div");
        wrapper.className = "MMM-WebRTC";

        // 创建状态显示容器
        const statusContainer = document.createElement("div");
        statusContainer.className = "status-container";

        // 创建状态文本
        const status = document.createElement("div");
        status.id = "webrtc-status";
        status.textContent = "正在连接...";
        
        // 创建状态指示点
        const indicator = document.createElement("div");
        indicator.className = "audio-indicator";
        
        // 将状态组件添加到容器
        statusContainer.appendChild(indicator);
        statusContainer.appendChild(status);
        wrapper.appendChild(statusContainer);

        // 创建语音波形动画
        const voiceAnimation = document.createElement("div");
        voiceAnimation.className = "voice-animation";
        for (let i = 0; i < 5; i++) {
            const bar = document.createElement("div");
            bar.className = "voice-bar";
            voiceAnimation.appendChild(bar);
        }
        wrapper.appendChild(voiceAnimation);

        const messages = document.createElement("div");
        messages.id = "messages";
        wrapper.appendChild(messages);

        return wrapper;
    }
}); 