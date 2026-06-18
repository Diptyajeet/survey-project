(function () {
    const sessionKey = "personaQuestSessionId";

    function getSessionId() {
        let sessionId = localStorage.getItem(sessionKey);

        if (!sessionId) {
            sessionId = crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random()}`;
            localStorage.setItem(sessionKey, sessionId);
        }

        return sessionId;
    }

    async function track(type, data = {}) {
        if (!window.fetch || location.protocol === "file:") {
            return;
        }

        try {
            await fetch("/api/events", {
                method:"POST",
                headers:{ "Content-Type":"application/json" },
                body:JSON.stringify({
                    type,
                    data,
                    sessionId:getSessionId(),
                    page:location.pathname
                })
            });
        } catch {
            // Tracking is optional; the user experience should keep working offline.
        }
    }

    window.personaAnalytics = { track, getSessionId };

    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", () => track("page_view"));
    } else {
        track("page_view");
    }
}());
