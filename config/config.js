/* Config Sample
 *
 * For more information on how you can configure this file
 * see https://docs.magicmirror.builders/configuration/introduction.html
 * and https://docs.magicmirror.builders/modules/configuration.html
 *
 * You can use environment variables using a `config.js.template` file instead of `config.js`
 * which will be converted to `config.js` while starting. For more information
 * see https://docs.magicmirror.builders/configuration/introduction.html#enviromnent-variables
 */
let config = {
	address: "0.0.0.0",	// Address to listen on, can be:
							// - "localhost", "127.0.0.1", "::1" to listen on loopback interface
							// - another specific IPv4/6 to listen on a specific interface
							// - "0.0.0.0", "::" to listen on any interface
							// Default, when address config is left out or empty, is "localhost"
	port: 8080,
	basePath: "/",	// The URL path where MagicMirror² is hosted. If you are using a Reverse proxy
									// you must set the sub path here. basePath must end with a /
	ipWhitelist: [],	// 允许所有 IP 访问

	useHttps: false,			// Support HTTPS or not, default "false" will use HTTP
	httpsPrivateKey: "",	// HTTPS private key path, only require when useHttps is true
	httpsCertificate: "",	// HTTPS Certificate path, only require when useHttps is true

	language: "zh-cn",
	locale: "zh-cn",
	logLevel: ["DEBUG", "INFO", "LOG", "WARN", "ERROR"], // Add "DEBUG" for even more logging
	timeFormat: 24,
	units: "metric",

	modules: [
		{
			module: "alert",
		},
		{
			module: "updatenotification",
			position: "top_bar"
		},
		{
			module: "clock",
			position: "top_left"
		},
		{
			module: "calendar",
			header: "中 国 节 日  ",
			position: "top_left",
			config: {
				calendars: [
					{
						fetchInterval: 7 * 24 * 60 * 60 * 1000,
						symbol: "calendar-check",
						url: "https://p10-calendars.icloud.com/holidays/cn_zh.ics"
					}
				]
			}
		},
		{
			module: "compliments",
			position: "lower_third"
		},
		{
			module: "weather",
			position: "top_right",
			config: {
				weatherProvider: "openmeteo",
				type: "current",
				lat: 22.543099,
				lon: 114.057868
			}
		},
		{
			module: "weather",
			position: "top_right",
			header: "天 气 预 报  ",
			config: {
				weatherProvider: "openmeteo",
				type: "forecast",
				lat: 22.543099,
				lon: 114.057868
			}
		},
		{
                        module: "newsfeed",
                        position: "bottom_bar",
                        config: {
                            feeds: [
                                {
                                   title: "New York Times",
                                   url: "http://www.nytimes.com/services/xml/rss/nyt/HomePage.xml"
                                }
                        ],
                        showSourceTitle: true,
                        showPublishDate: true,
                        broadcastNewsFeeds: true,
                        broadcastNewsUpdates: true,
                        
                }
		},
		{
			module: "MMM-WebRTC",
			position: "top_right",
			config: {
				autoStart: true,
				coze: {
					botId: "7453329674383900709",
					voiceId: "7426720361733062665",
					baseURL: "https://api.coze.cn",
					accessToken: "pat_Pc4w4iFQpmSzDwiQcR76I9j4okAfHmlpg65gFkUcA7pCZwVsoZ6VPMwxm1PFMJ0w",
					allowPersonalAccessTokenInBrowser: true,
					audioMutedDefault: false,
					videoConfig: {
						renderDom: 'webrtc-container',
						videoOnDefault: false
					},
					debug: true,
					roomConfig: {
						isAutoPublish: true,
						isAutoSubscribeAudio: true,
						isAutoSubscribeVideo: true,
						// 添加以下音频配置
						audioConfig: {
							autoPlayAfterMuted: true,
							autoGainControl: false,
							echoCancellation: false,
							noiseSuppression: false
						},
						// 添加媒体约束
						mediaConstraints: {
							audio: {
								sampleRate: 16000,
								channelCount: 1,
								volume: 1.0,
								autoGainControl: false,
								echoCancellation: false,
								noiseSuppression: false
							}
						}
					},
				},
				suppressStationaryNoise: true,
				suppressNonStationaryNoise: true,
				connectorId: '1024',
				containerClass: 'webrtc-container'
			}				
		}
	]
};

/*************** DO NOT EDIT THE LINE BELOW ***************/
if (typeof module !== "undefined") { module.exports = config; }
