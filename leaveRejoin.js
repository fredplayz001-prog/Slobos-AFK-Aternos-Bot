function randomMs(minMs, maxMs) {
    return Math.floor(Math.random() * (maxMs - minMs + 1)) + minMs
}

function setupLeaveRejoin(bot, createBot) {
    let leaveTimer = null
    let jumpTimer = null
    let jumpOffTimer = null

    let stopped = false
    let lastLogAt = 0

    function logThrottled(msg, minGapMs = 2000) {
        const now = Date.now()
        if (now - lastLogAt >= minGapMs) {
            lastLogAt = now
            console.log(msg)
        }
    }

    function cleanup() {
        stopped = true
        if (leaveTimer) clearTimeout(leaveTimer)
        if (jumpTimer) clearTimeout(jumpTimer)
        if (jumpOffTimer) clearTimeout(jumpOffTimer)
        leaveTimer = jumpTimer = jumpOffTimer = null
    }

    function scheduleNextJump() {
        if (stopped || !bot.entity) return

        try {
            bot.setControlState('jump', true)
        } catch (e) {}

        jumpOffTimer = setTimeout(() => {
            try { bot.setControlState('jump', false) } catch (e) {}
        }, 300)

        // Random jump every 20s to 3 minutes
        const nextJump = randomMs(20000, 3 * 60 * 1000)
        jumpTimer = setTimeout(scheduleNextJump, nextJump)
    }

    bot.once('spawn', () => {
        // Reset state on successful connect
        cleanup()
        stopped = false

        // Stay on server 1 to 5 minutes before voluntary leave/rejoin cycle
        const stayTime = randomMs(60000, 300000)
        logThrottled(`[LeaveRejoin] Will do voluntary leave in ${Math.round(stayTime / 1000)}s`)

        scheduleNextJump()

        leaveTimer = setTimeout(() => {
            if (stopped) return
            logThrottled('[LeaveRejoin] Voluntary leave (timer expired)')
            cleanup()
            try { bot.quit() } catch (e) {}
            // index.js 'end' handler will call scheduleReconnect automatically
        }, stayTime)
    })

    // On any disconnect — just clean up our timers.
    // Reconnect is handled by index.js via the 'end' event.
    bot.on('end', () => { cleanup() })
    bot.on('kicked', () => { cleanup() })
    bot.on('error', () => { cleanup() })
}

module.exports = setupLeaveRejoin
