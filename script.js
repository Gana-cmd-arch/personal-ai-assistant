class NexusAI {
    constructor() {
        this.isListening = false;
        this.recognition = null;
        this.synthesis = window.speechSynthesis;
        this.currentVoice = null;
        this.notes = JSON.parse(localStorage.getItem('nexus-notes') || '[]');
        this.reminders = JSON.parse(localStorage.getItem('nexus-reminders') || '[]');
        
        this.initializeElements();
        this.initializeSpeechRecognition();
        this.initializeSpeechSynthesis();
        this.bindEvents();
        this.loadStoredData();
        this.checkReminders();
        
        // Check reminders every minute
        setInterval(() => this.checkReminders(), 60000);
    }

    initializeElements() {
        this.voiceButton = document.getElementById('voiceButton');
        this.voiceStatus = document.getElementById('voiceStatus');
        this.voiceVisualizer = document.getElementById('voiceVisualizer');
        this.chatMessages = document.getElementById('chatMessages');
        this.sidePanel = document.getElementById('sidePanel');
        this.closePanel = document.getElementById('closePanel');
        this.notesList = document.getElementById('notesList');
        this.remindersList = document.getElementById('remindersList');
        this.tabButtons = document.querySelectorAll('.tab-btn');
        this.tabPanels = document.querySelectorAll('.tab-panel');
        this.actionButtons = document.querySelectorAll('.action-btn');
    }

    initializeSpeechRecognition() {
        if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
            const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
            this.recognition = new SpeechRecognition();
            
            this.recognition.continuous = false;
            this.recognition.interimResults = false;
            this.recognition.lang = 'en-US';
            
            this.recognition.onstart = () => {
                this.isListening = true;
                this.updateVoiceUI();
                this.voiceStatus.textContent = 'Listening...';
            };
            
            this.recognition.onresult = (event) => {
                const transcript = event.results[0][0].transcript;
                this.handleVoiceInput(transcript);
            };
            
            this.recognition.onerror = (event) => {
                console.error('Speech recognition error:', event.error);
                this.stopListening();
                this.speak('Sorry, I had trouble hearing you. Please try again.');
            };
            
            this.recognition.onend = () => {
                this.stopListening();
            };
        } else {
            console.warn('Speech recognition not supported');
            this.voiceStatus.textContent = 'Voice not supported';
        }
    }

    initializeSpeechSynthesis() {
        if (this.synthesis) {
            // Wait for voices to load
            const loadVoices = () => {
                const voices = this.synthesis.getVoices();
                // Prefer female voice for AI assistant
                this.currentVoice = voices.find(voice => 
                    voice.name.toLowerCase().includes('female') ||
                    voice.name.toLowerCase().includes('samantha') ||
                    voice.name.toLowerCase().includes('alex')
                ) || voices[0];
            };
            
            if (this.synthesis.getVoices().length > 0) {
                loadVoices();
            } else {
                this.synthesis.onvoiceschanged = loadVoices;
            }
        }
    }

    bindEvents() {
        // Voice button
        this.voiceButton.addEventListener('click', () => {
            if (this.isListening) {
                this.stopListening();
            } else {
                this.startListening();
            }
        });

        // Close panel
        this.closePanel.addEventListener('click', () => {
            this.sidePanel.classList.remove('open');
        });

        // Tab switching
        this.tabButtons.forEach(button => {
            button.addEventListener('click', () => {
                const tabName = button.dataset.tab;
                this.switchTab(tabName);
            });
        });

        // Action buttons
        this.actionButtons.forEach(button => {
            button.addEventListener('click', () => {
                const command = button.dataset.command;
                this.handleCommand(command);
            });
        });

        // Keyboard shortcuts
        document.addEventListener('keydown', (e) => {
            if (e.key === ' ' && e.ctrlKey) {
                e.preventDefault();
                if (this.isListening) {
                    this.stopListening();
                } else {
                    this.startListening();
                }
            }
        });
    }

    startListening() {
        if (this.recognition && !this.isListening) {
            try {
                this.recognition.start();
            } catch (error) {
                console.error('Error starting recognition:', error);
            }
        }
    }

    stopListening() {
        this.isListening = false;
        this.updateVoiceUI();
        this.voiceStatus.textContent = 'Tap to speak';
        if (this.recognition) {
            this.recognition.stop();
        }
    }

    updateVoiceUI() {
        if (this.isListening) {
            this.voiceButton.classList.add('listening');
            this.voiceVisualizer.classList.add('active');
            this.voiceStatus.classList.add('listening');
        } else {
            this.voiceButton.classList.remove('listening');
            this.voiceVisualizer.classList.remove('active');
            this.voiceStatus.classList.remove('listening');
        }
    }

    handleVoiceInput(transcript) {
        console.log('Voice input:', transcript);
        this.addMessage(transcript, 'user');
        this.processCommand(transcript);
    }

    processCommand(input) {
        const command = input.toLowerCase().trim();
        
        if (command.includes('save note') || command.includes('take note')) {
            this.handleSaveNote(input);
        } else if (command.includes('remind me') || command.includes('reminder')) {
            this.handleReminder(input);
        } else if (command.includes('time') || command.includes('what time')) {
            this.handleTimeQuery();
        } else if (command.includes('date') || command.includes('what date')) {
            this.handleDateQuery();
        } else if (command.includes('show notes') || command.includes('my notes')) {
            this.showNotes();
        } else if (command.includes('show reminders') || command.includes('my reminders')) {
            this.showReminders();
        } else if (command.includes('hello') || command.includes('hi')) {
            this.handleGreeting();
        } else if (command.includes('help')) {
            this.handleHelp();
        } else {
            this.handleGeneralQuery(input);
        }
    }

    handleCommand(command) {
        switch (command) {
            case 'time':
                this.handleTimeQuery();
                break;
            case 'notes':
                this.showNotes();
                break;
            case 'reminders':
                this.showReminders();
                break;
        }
    }

    handleSaveNote(input) {
        // Extract note content after "save note" or "take note"
        const noteContent = input.replace(/(save note|take note)/i, '').trim();
        
        if (noteContent) {
            const note = {
                id: Date.now(),
                content: noteContent,
                timestamp: new Date().toISOString(),
                created: new Date().toLocaleString()
            };
            
            this.notes.unshift(note);
            this.saveNotes();
            this.updateNotesDisplay();
            
            const response = `Note saved: "${noteContent}"`;
            this.addMessage(response, 'ai');
            this.speak(response);
        } else {
            const response = "What would you like me to save as a note?";
            this.addMessage(response, 'ai');
            this.speak(response);
        }
    }

    handleReminder(input) {
        // Simple reminder parsing - in a real app, you'd use more sophisticated NLP
        const reminderContent = input.replace(/(remind me|reminder)/i, '').trim();
        
        if (reminderContent) {
            const reminder = {
                id: Date.now(),
                content: reminderContent,
                timestamp: new Date().toISOString(),
                created: new Date().toLocaleString(),
                active: true
            };
            
            this.reminders.unshift(reminder);
            this.saveReminders();
            this.updateRemindersDisplay();
            
            const response = `Reminder set: "${reminderContent}"`;
            this.addMessage(response, 'ai');
            this.speak(response);
        } else {
            const response = "What would you like me to remind you about?";
            this.addMessage(response, 'ai');
            this.speak(response);
        }
    }

    handleTimeQuery() {
        const now = new Date();
        const timeString = now.toLocaleTimeString([], { 
            hour: '2-digit', 
            minute: '2-digit',
            hour12: true 
        });
        
        const response = `The current time is ${timeString}`;
        this.addMessage(response, 'ai');
        this.speak(response);
    }

    handleDateQuery() {
        const now = new Date();
        const dateString = now.toLocaleDateString([], { 
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });
        
        const response = `Today is ${dateString}`;
        this.addMessage(response, 'ai');
        this.speak(response);
    }

    handleGreeting() {
        const greetings = [
            "Hello! How can I assist you today?",
            "Hi there! What can I help you with?",
            "Greetings! I'm here to help.",
            "Hello! Ready to assist you."
        ];
        
        const response = greetings[Math.floor(Math.random() * greetings.length)];
        this.addMessage(response, 'ai');
        this.speak(response);
    }

    handleHelp() {
        const response = "I can help you with notes, reminders, and answering questions. Try saying 'Save note', 'Remind me', or 'What's the time?'";
        this.addMessage(response, 'ai');
        this.speak(response);
    }

    handleGeneralQuery(input) {
        // Simple responses for demo - in a real app, you'd integrate with an AI service
        const responses = [
            "That's an interesting question. I'm a local AI assistant focused on notes and reminders.",
            "I understand you're asking about that. My main functions are managing notes and reminders.",
            "I'm designed to help with personal organization. Would you like to save a note or set a reminder?",
            "I can help you stay organized with notes and reminders. What would you like to do?"
        ];
        
        const response = responses[Math.floor(Math.random() * responses.length)];
        this.addMessage(response, 'ai');
        this.speak(response);
    }

    showNotes() {
        this.sidePanel.classList.add('open');
        this.switchTab('notes');
        
        const response = this.notes.length > 0 
            ? `You have ${this.notes.length} saved notes.`
            : "You don't have any saved notes yet.";
        
        this.addMessage(response, 'ai');
        this.speak(response);
    }

    showReminders() {
        this.sidePanel.classList.add('open');
        this.switchTab('reminders');
        
        const activeReminders = this.reminders.filter(r => r.active);
        const response = activeReminders.length > 0 
            ? `You have ${activeReminders.length} active reminders.`
            : "You don't have any active reminders.";
        
        this.addMessage(response, 'ai');
        this.speak(response);
    }

    switchTab(tabName) {
        // Update tab buttons
        this.tabButtons.forEach(btn => {
            btn.classList.toggle('active', btn.dataset.tab === tabName);
        });
        
        // Update tab panels
        this.tabPanels.forEach(panel => {
            panel.classList.toggle('active', panel.id === `${tabName}Panel`);
        });
    }

    addMessage(content, sender) {
        const messageDiv = document.createElement('div');
        messageDiv.className = `message ${sender}-message`;
        
        const avatar = document.createElement('div');
        avatar.className = `${sender}-avatar`;
        
        const messageContent = document.createElement('div');
        messageContent.className = 'message-content';
        
        const paragraph = document.createElement('p');
        paragraph.textContent = content;
        
        messageContent.appendChild(paragraph);
        messageDiv.appendChild(avatar);
        messageDiv.appendChild(messageContent);
        
        this.chatMessages.appendChild(messageDiv);
        this.chatMessages.scrollTop = this.chatMessages.scrollHeight;
        
        // Add typing effect for AI messages
        if (sender === 'ai') {
            paragraph.classList.add('typing-effect');
        }
    }

    speak(text) {
        if (this.synthesis && this.currentVoice) {
            // Cancel any ongoing speech
            this.synthesis.cancel();
            
            const utterance = new SpeechSynthesisUtterance(text);
            utterance.voice = this.currentVoice;
            utterance.rate = 0.9;
            utterance.pitch = 1.1;
            utterance.volume = 0.8;
            
            this.synthesis.speak(utterance);
        }
    }

    saveNotes() {
        localStorage.setItem('nexus-notes', JSON.stringify(this.notes));
    }

    saveReminders() {
        localStorage.setItem('nexus-reminders', JSON.stringify(this.reminders));
    }

    loadStoredData() {
        this.updateNotesDisplay();
        this.updateRemindersDisplay();
    }

    updateNotesDisplay() {
        this.notesList.innerHTML = '';
        
        this.notes.forEach(note => {
            const noteElement = document.createElement('div');
            noteElement.className = 'note-item';
            noteElement.innerHTML = `
                <div class="note-content">${note.content}</div>
                <div class="note-timestamp">${note.created}</div>
                <button class="delete-note" data-id="${note.id}">Delete</button>
            `;
            
            // Add delete functionality
            const deleteBtn = noteElement.querySelector('.delete-note');
            deleteBtn.addEventListener('click', () => this.deleteNote(note.id));
            
            this.notesList.appendChild(noteElement);
        });
        
        if (this.notes.length === 0) {
            this.notesList.innerHTML = '<p style="color: var(--text-muted); text-align: center;">No notes saved yet</p>';
        }
    }

    updateRemindersDisplay() {
        this.remindersList.innerHTML = '';
        
        const activeReminders = this.reminders.filter(r => r.active);
        
        activeReminders.forEach(reminder => {
            const reminderElement = document.createElement('div');
            reminderElement.className = 'reminder-item';
            reminderElement.innerHTML = `
                <div class="reminder-content">${reminder.content}</div>
                <div class="reminder-timestamp">${reminder.created}</div>
                <button class="complete-reminder" data-id="${reminder.id}">Complete</button>
            `;
            
            // Add complete functionality
            const completeBtn = reminderElement.querySelector('.complete-reminder');
            completeBtn.addEventListener('click', () => this.completeReminder(reminder.id));
            
            this.remindersList.appendChild(reminderElement);
        });
        
        if (activeReminders.length === 0) {
            this.remindersList.innerHTML = '<p style="color: var(--text-muted); text-align: center;">No active reminders</p>';
        }
    }

    deleteNote(id) {
        this.notes = this.notes.filter(note => note.id !== id);
        this.saveNotes();
        this.updateNotesDisplay();
    }

    completeReminder(id) {
        const reminder = this.reminders.find(r => r.id === id);
        if (reminder) {
            reminder.active = false;
            this.saveReminders();
            this.updateRemindersDisplay();
        }
    }

    checkReminders() {
        // Simple reminder checking - in a real app, you'd implement more sophisticated scheduling
        const now = new Date();
        const activeReminders = this.reminders.filter(r => r.active);
        
        // For demo, we'll just show a notification for reminders older than 1 hour
        activeReminders.forEach(reminder => {
            const reminderTime = new Date(reminder.timestamp);
            const hoursDiff = (now - reminderTime) / (1000 * 60 * 60);
            
            if (hoursDiff >= 1 && !reminder.notified) {
                this.showReminderNotification(reminder);
                reminder.notified = true;
                this.saveReminders();
            }
        });
    }

    showReminderNotification(reminder) {
        // Show browser notification if supported
        if ('Notification' in window && Notification.permission === 'granted') {
            new Notification('NEXUS Reminder', {
                body: reminder.content,
                icon: '/favicon.ico'
            });
        }
        
        // Also speak the reminder
        this.speak(`Reminder: ${reminder.content}`);
        this.addMessage(`🔔 Reminder: ${reminder.content}`, 'ai');
    }

    // Request notification permission on load
    requestNotificationPermission() {
        if ('Notification' in window && Notification.permission === 'default') {
            Notification.requestPermission();
        }
    }
}

// Initialize the AI assistant when the page loads
document.addEventListener('DOMContentLoaded', () => {
    const nexusAI = new NexusAI();
    nexusAI.requestNotificationPermission();
    
    // Add some style for delete/complete buttons
    const style = document.createElement('style');
    style.textContent = `
        .delete-note, .complete-reminder {
            background: rgba(255, 59, 48, 0.2);
            border: 1px solid rgba(255, 59, 48, 0.5);
            color: #ff3b30;
            padding: 0.25rem 0.5rem;
            border-radius: 5px;
            font-size: 0.75rem;
            cursor: pointer;
            margin-top: 0.5rem;
            transition: all 0.3s ease;
        }
        
        .delete-note:hover, .complete-reminder:hover {
            background: rgba(255, 59, 48, 0.3);
            transform: translateY(-1px);
        }
        
        .complete-reminder {
            background: rgba(79, 255, 176, 0.2);
            border-color: rgba(79, 255, 176, 0.5);
            color: var(--accent-primary);
        }
        
        .complete-reminder:hover {
            background: rgba(79, 255, 176, 0.3);
        }
    `;
    document.head.appendChild(style);
});

// Service Worker for offline functionality (optional enhancement)
if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('/sw.js')
            .then(registration => console.log('SW registered'))
            .catch(error => console.log('SW registration failed'));
    });
}

