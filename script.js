document.addEventListener("DOMContentLoaded", () => {
    // ---- SPA ROUTING ----
    const navBtns = document.querySelectorAll('.nav-btn');
    const views = document.querySelectorAll('.view');

    navBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            const targetId = btn.getAttribute('data-target');
            if (!targetId) return; // Skip if no target (e.g., logout button)

            // Remove active from all buttons
            navBtns.forEach(b => b.classList.remove('active'));
            // Add active to clicked
            btn.classList.add('active');
            
            // Hide all views
            views.forEach(v => {
                v.classList.remove('active');
                v.classList.remove('fade-in');
            });
            
            // Show target view
            const targetView = document.getElementById(targetId);
            if(targetView) {
                targetView.classList.add('active');
                targetView.classList.add('fade-in');
            }
        });
    });

    // ---- CHART.JS DEFAULTS ----
    Chart.defaults.color = '#a0a0b0';
    Chart.defaults.font.family = "'Inter', sans-serif";
    const commonOptions = {
        responsive: true, maintainAspectRatio: false,
        plugins: {
            legend: { labels: { color: '#e2e2e2' } },
            tooltip: {
                backgroundColor: 'rgba(20, 20, 25, 0.9)', titleColor: '#fff', bodyColor: '#e2e2e2',
                borderColor: 'rgba(255, 255, 255, 0.1)', borderWidth: 1, padding: 10, cornerRadius: 8,
            }
        },
        scales: {
            x: { grid: { color: 'rgba(255, 255, 255, 0.05)', drawBorder: false } },
            y: { grid: { color: 'rgba(255, 255, 255, 0.05)', drawBorder: false } }
        }
    };
    const colors = {
        primary: 'rgba(232, 28, 255, 0.8)', primaryBorder: 'rgba(232, 28, 255, 1)',
        secondary: 'rgba(64, 201, 255, 0.8)', secondaryBorder: 'rgba(64, 201, 255, 1)',
    };

    let globalData = null;
    let compareChartInstance = null;

    // ---- FETCH DATA ----
    fetch('data.json')
        .then(res => res.json())
        .then(data => {
            globalData = data;
            initStatsView(data);
            initCompareView(data);
            initScheduleView(data);
        })
        .catch(err => console.error("Error loading json:", err));

    // ---- INIT STATS VIEW ----
    function initStatsView(data) {
        // Global Stats
        animateValue("val-matches", 0, data.total_matches, 1500);
        animateValue("val-runs", 0, data.total_runs, 2000);
        animateValue("val-wickets", 0, data.total_wickets, 2000);

        // Cap Holders
        const topRunList = Object.entries(data.players).sort((a,b) => b[1].runs - a[1].runs);
        const topWicketList = Object.entries(data.players).sort((a,b) => b[1].wickets - a[1].wickets);
        
        if (topRunList.length > 0) {
            document.getElementById('orange-cap-name').innerText = topRunList[0][0];
            document.getElementById('orange-cap-stat').innerText = `${topRunList[0][1].runs} Runs`;
        }
        if (topWicketList.length > 0) {
            document.getElementById('purple-cap-name').innerText = topWicketList[0][0];
            document.getElementById('purple-cap-stat').innerText = `${topWicketList[0][1].wickets} Wickets`;
        }

        // Charts
        createBarChart('runsChart', data.top_run_scorers, 'Total Runs', colors.primary, colors.primaryBorder);
        createBarChart('wicketsChart', data.top_wicket_takers, 'Total Wickets', colors.secondary, colors.secondaryBorder);

        // Line Chart
        const teamWinsCtx = document.getElementById('teamWinsChart').getContext('2d');
        const teamLabels = Object.keys(data.matches_won_by_team).slice(0, 10);
        const teamData = Object.values(data.matches_won_by_team).slice(0, 10);
        let grad = teamWinsCtx.createLinearGradient(0,0,0,400); 
        grad.addColorStop(0, 'rgba(0, 219, 222, 0.6)'); grad.addColorStop(1, 'transparent');
        new Chart(teamWinsCtx, {
            type: 'line',
            data: {
                labels: teamLabels,
                datasets: [{
                    label: 'Matches Won', data: teamData, backgroundColor: grad, borderColor: 'rgba(0, 219, 222, 1)',
                    borderWidth: 3, pointBackgroundColor: '#fff', fill: true, tension: 0.4
                }]
            },
            options: commonOptions
        });

        // Toss Doughnut
        new Chart(document.getElementById('tossChart'), {
            type: 'doughnut',
            data: {
                labels: ['Bat First', 'Field First'],
                datasets: [{
                    data: [data.toss_decision_wins.bat, data.toss_decision_wins.field],
                    backgroundColor: ['rgba(255, 95, 109, 0.8)', 'rgba(64, 201, 255, 0.8)'],
                    borderWidth: 0, hoverOffset: 10
                }]
            },
            options: { responsive: true, maintainAspectRatio: false, cutout: '65%', plugins: { legend: { position: 'bottom' }} }
        });
    }

    function createBarChart(id, dataObj, label, bgColor, borderColor) {
        const ctx = document.getElementById(id).getContext('2d');
        let grad = ctx.createLinearGradient(0,0,0,400); grad.addColorStop(0, bgColor); grad.addColorStop(1, 'transparent');
        new Chart(ctx, {
            type: 'bar',
            data: {
                labels: Object.keys(dataObj),
                datasets: [{ label: label, data: Object.values(dataObj), backgroundColor: grad, borderColor: borderColor, borderWidth: 1, borderRadius: 6 }]
            },
            options: commonOptions
        });
    }

    // ---- INIT COMPARE VIEW ----
    function initCompareView(data) {
        const selectA = document.getElementById('player-a-select');
        const selectB = document.getElementById('player-b-select');
        
        // Populate options alphabetically
        const players = Object.keys(data.players).sort();
        players.forEach(p => {
            if (data.players[p].matches > 5) { // Filter out extreme minor players
                selectA.add(new Option(p, p));
                selectB.add(new Option(p, p));
            }
        });

        // Pre-select two famous players if they exist
        if(players.includes("V Kohli")) selectA.value = "V Kohli";
        if(players.includes("RG Sharma")) selectB.value = "RG Sharma";

        function updateComparison() {
            const pa = selectA.value;
            const pb = selectB.value;
            
            if(!pa || !pb) { document.getElementById('compare-results').style.display = 'none'; return; }
            document.getElementById('compare-results').style.display = 'block';

            const datA = data.players[pa];
            const datB = data.players[pb];

            document.getElementById('vs-name-a').innerText = pa;
            document.getElementById('vs-name-b').innerText = pb;
            
            // Stats tables
            document.getElementById('stat-a-name').innerText = pa;
            document.getElementById('stat-a-matches').innerText = datA.matches;
            document.getElementById('stat-a-avg').innerText = datA.avg;
            document.getElementById('stat-a-sr').innerText = datA.sr;
            document.getElementById('stat-a-100s').innerText = `${datA.centuries} / ${datA.fifties}`;
            document.getElementById('stat-a-eco').innerText = datA.eco;

            document.getElementById('stat-b-name').innerText = pb;
            document.getElementById('stat-b-matches').innerText = datB.matches;
            document.getElementById('stat-b-avg').innerText = datB.avg;
            document.getElementById('stat-b-sr').innerText = datB.sr;
            document.getElementById('stat-b-100s').innerText = `${datB.centuries} / ${datB.fifties}`;
            document.getElementById('stat-b-eco').innerText = datB.eco;

            // Radar Chart
            updateRadarChart(pa, datA, pb, datB);
        }

        selectA.addEventListener('change', updateComparison);
        selectB.addEventListener('change', updateComparison);
        // initial render
        updateComparison();
    }

    function updateRadarChart(nameA, datA, nameB, datB) {
        const ctx = document.getElementById('compareChart').getContext('2d');
        if(compareChartInstance) compareChartInstance.destroy();

        // Normalize some extremely variable stats for the radar chart representation
        // (Like runs can be 6000, while avg is 40). We compare relative to each other.
        const maxAvg = Math.max(datA.avg, datB.avg, 1);
        const maxSr = Math.max(datA.sr, datB.sr, 1);
        const max100s = Math.max(datA.centuries, datB.centuries, 1);
        const maxRuns = Math.max(datA.runs, datB.runs, 1);

        compareChartInstance = new Chart(ctx, {
            type: 'radar',
            data: {
                labels: ['Batting Avg', 'Strike Rate', 'Centuries', 'Total Runs Exp', 'Matches Exp'],
                datasets: [
                    {
                        label: nameA,
                        data: [
                            (datA.avg / maxAvg) * 100,
                            (datA.sr / maxSr) * 100,
                            (datA.centuries / max100s) * 100,
                            (datA.runs / maxRuns) * 100,
                            (datA.matches / Math.max(datA.matches, datB.matches, 1)) * 100
                        ],
                        backgroundColor: 'rgba(232, 28, 255, 0.2)',
                        borderColor: 'rgba(232, 28, 255, 1)',
                        pointBackgroundColor: 'rgba(232, 28, 255, 1)',
                    },
                    {
                        label: nameB,
                        data: [
                            (datB.avg / maxAvg) * 100,
                            (datB.sr / maxSr) * 100,
                            (datB.centuries / max100s) * 100,
                            (datB.runs / maxRuns) * 100,
                            (datB.matches / Math.max(datA.matches, datB.matches, 1)) * 100
                        ],
                        backgroundColor: 'rgba(64, 201, 255, 0.2)',
                        borderColor: 'rgba(64, 201, 255, 1)',
                        pointBackgroundColor: 'rgba(64, 201, 255, 1)',
                    }
                ]
            },
            options: {
                responsive: true, maintainAspectRatio: false,
                scales: {
                    r: {
                        angleLines: { color: 'rgba(255,255,255,0.1)' },
                        grid: { color: 'rgba(255,255,255,0.1)' },
                        pointLabels: { color: '#a0a0b0', font: { size: 14 } },
                        ticks: { display: false, min: 0, max: 100 } // relative 100% scale
                    }
                },
                plugins: {
                    tooltip: {
                        callbacks: { label: function(ctx) { return `${ctx.dataset.label}: ${ctx.raw.toFixed(1)}% Relative`; } }
                    }
                }
            }
        });
    }

    // ---- INIT SCHEDULE VIEW ----
    function initScheduleView(data) {
        const container = document.getElementById('schedule-container');
        if(!data.schedule || data.schedule.length === 0) {
            container.innerHTML = '<p>No schedule available</p>';
            return;
        }
        
        let html = '';
        data.schedule.forEach(sch => {
            html += `
            <div class="glass-card sch-card">
                <div>
                    <div class="sch-teams">${sch.match}</div>
                    <div class="sch-date">${sch.date}</div>
                </div>
                <div class="sch-info">
                    <div>Venue: ${sch.venue}</div>
                    <div class="highlight">${sch.result}</div>
                </div>
            </div>`;
        });
        container.innerHTML = html;
    }

    // ---- POLLS LOGIC (LocalStorage) ----
    const pollBtns = document.querySelectorAll('.poll-btn');
    
    // Load existing votes
    let votes = JSON.parse(localStorage.getItem('ipl-polls')) || { "1": {}, "2": {} };
    let userVoted = JSON.parse(localStorage.getItem('ipl-voted')) || {};

    function renderPolls() {
        [1, 2].forEach(pollId => {
            const hasVoted = userVoted[pollId] !== undefined;
            const pollVotes = votes[pollId];
            let total = 0;
            for(let key in pollVotes) total += pollVotes[key];
            
            document.querySelectorAll(`.poll-btn[data-poll="${pollId}"]`).forEach(btn => {
                const opt = btn.getAttribute('data-option');
                const btnVotes = pollVotes[opt] || 0;
                const perc = total > 0 ? Math.round((btnVotes / total) * 100) : 0;
                
                if (hasVoted) {
                    btn.style.setProperty('--fill', `${perc}%`);
                    btn.querySelector('.percent').innerText = `${perc}%`;
                    btn.style.pointerEvents = 'none'; // disable further clicks
                    if(userVoted[pollId] === opt) btn.classList.add('voted');
                }
            });
        });
    }

    pollBtns.forEach(btn => {
        btn.addEventListener('click', (e) => {
            const pollId = btn.getAttribute('data-poll');
            const opt = btn.getAttribute('data-option');
            if (userVoted[pollId]) return; // already voted

            // Register vote
            if(!votes[pollId][opt]) votes[pollId][opt] = 0;
            votes[pollId][opt]++;
            userVoted[pollId] = opt;

            localStorage.setItem('ipl-polls', JSON.stringify(votes));
            localStorage.setItem('ipl-voted', JSON.stringify(userVoted));
            renderPolls();
        });
    });
    renderPolls();

    // ---- DEBATE LOGIC (LocalStorage) ----
    const postBtn = document.getElementById('post-btn');
    const nameInput = document.getElementById('debate-name');
    const msgInput = document.getElementById('debate-msg');
    const feed = document.getElementById('debate-feed');

    let comments = JSON.parse(localStorage.getItem('ipl-comments')) || [
        { name: "CricketFan99", msg: "Kohli is looking in supreme touch this season!", time: "2 hrs ago" },
        { name: "MIForever", msg: "Can't wait for El Clasico... CSK vs MI is always a thriller.", time: "4 hrs ago" }
    ];

    function renderComments() {
        feed.innerHTML = '';
        comments.forEach(c => {
            feed.innerHTML += `
            <div class="glass-card comment-card">
                <div class="comment-header">
                    <span class="comment-name">${c.name}</span>
                    <span class="comment-time">${c.time}</span>
                </div>
                <div class="comment-body">${c.msg}</div>
            </div>`;
        });
    }

    postBtn.addEventListener('click', () => {
        const name = nameInput.value.trim() || 'Anonymous';
        const msg = msgInput.value.trim();
        if(msg) {
            comments.unshift({ name, msg, time: "Just now" });
            localStorage.setItem('ipl-comments', JSON.stringify(comments));
            msgInput.value = '';
            renderComments();
        }
    });
    renderComments();

    // ---- AI CHATBOT LOGIC (GROQ) ----
    const chatInput = document.getElementById('chat-input');
    const chatSendBtn = document.getElementById('chat-send-btn');
    const chatMessages = document.getElementById('chat-messages');
    
    // Store chat history for context
    let chatHistory = [
        { role: "system", content: "You are a specialized Cricket and IPL AI Assistant. Always be enthusiastic and provide accurate, detailed stats about cricket. Only talk about cricket and IPL. If the user asks non-cricket questions, politely decline and steer them back to cricket." }
    ];

    function appendMessage(role, text) {
        const msgDiv = document.createElement('div');
        msgDiv.className = `message ${role}-message`;
        msgDiv.innerHTML = `<div class="msg-bubble">${text.replace(/\\n/g, '<br>')}</div>`;
        chatMessages.appendChild(msgDiv);
        chatMessages.scrollTop = chatMessages.scrollHeight;
    }

    async function handleSend() {
        const text = chatInput.value.trim();
        if(!text) return;
        
        appendMessage('user', text);
        chatInput.value = '';
        chatHistory.push({ role: "user", content: text });
        
        // Add loading state
        const loadDiv = document.createElement('div');
        loadDiv.className = 'message system-message';
        loadDiv.id = 'chat-loading';
        loadDiv.innerText = 'AI is thinking...';
        chatMessages.appendChild(loadDiv);
        chatMessages.scrollTop = chatMessages.scrollHeight;

        try {
            const res = await fetch('/api/chat', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    model: "llama-3.1-8b-instant",
                    messages: chatHistory,
                    temperature: 0.7,
                    max_tokens: 1024
                })
            });
            const data = await res.json();
            document.getElementById('chat-loading').remove();
            
            if(data.choices && data.choices.length > 0) {
                const aiResponse = data.choices[0].message.content;
                chatHistory.push({ role: "assistant", content: aiResponse });
                // Replace formatting for line breaks safely
                appendMessage('ai', aiResponse.replace(/\n/g, '<br>'));
            } else {
                appendMessage('system', 'Sorry, I encountered an error. Please try again.');
            }
        } catch(err) {
            if (document.getElementById('chat-loading')) document.getElementById('chat-loading').remove();
            appendMessage('system', 'Connection failed. Ensure your API Key is correct and internet is active.');
        }
    }

    if (chatSendBtn) {
        chatSendBtn.addEventListener('click', handleSend);
        chatInput.addEventListener('keypress', (e) => { if(e.key === 'Enter') handleSend(); });
    }

    // ---- ANIMATION HELPER ----
    function animateValue(id, start, end, duration) {
        if (start === end) return;
        var obj = document.getElementById(id);
        if(!obj) return;
        var range = end - start;
        var current = start;
        var stepTime = Math.abs(Math.floor(duration / range));
        stepTime = Math.max(stepTime, 20); 
        var increment = range / (duration / stepTime);
        var timer = setInterval(function() {
            current += increment;
            if ((increment > 0 && current >= end) || (increment < 0 && current <= end)) {
                current = end; clearInterval(timer);
            }
            obj.innerHTML = Math.floor(current).toLocaleString();
        }, stepTime);
    }
});
