const NodeHelper = require("node_helper");

module.exports = NodeHelper.create({
    // 存储连接的客户端
    clients: new Set(),

    start: function() {
        console.log("Starting node helper for: " + this.name);
    },
    
    // 处理来自前端的通知
    socketNotificationReceived: function(notification, payload) {
        switch(notification) {
            case "WEBRTC_INIT":
                this.handleClientInit(this.sender);
                break;
            case "ICE_CANDIDATE":
                this.broadcastToOthers("ICE_CANDIDATE_RECEIVED", payload, this.sender);
                break;
            case "SEND_OFFER":
                this.broadcastToOthers("OFFER_RECEIVED", payload, this.sender);
                break;
            case "SEND_ANSWER":
                this.broadcastToOthers("ANSWER_RECEIVED", payload, this.sender);
                break;
        }
    },

    // 处理新客户端连接
    handleClientInit: function(socket) {
        if (!this.clients.has(socket)) {
            this.clients.add(socket);
            // 通知其他客户端有新连接
            this.broadcastToOthers("NEW_PEER", {}, socket);
        }
    },

    // 广播消息给除了发送者以外的所有客户端
    broadcastToOthers: function(notification, payload, sender) {
        this.clients.forEach(socket => {
            if (socket !== sender) {
                this.sendSocketNotification(notification, payload);
            }
        });
    }
}); 