class AIInterview {
  constructor() {
    this.isInterviewActive = false
    this.isRecording = false
    this.currentQuestionIndex = 0
    this.questions = []
    this.responses = []
    this.timerInterval = null
    this.timeRemaining = 0
    this.recognition = null
    this.cameraStream = null
    this.speechSynthesis = window.speechSynthesis
    this.currentTranscript = ""
    // this.fullTranscript = ""

    this.initializeElements()
    this.loadQuestions()
    this.setupEventListeners()
  }

  initializeElements() {
    this.startInterviewBtn = document.getElementById("startInterviewBtn")
    this.speakingBtn = document.getElementById("speakingBtn")
    this.timerDisplay = document.getElementById("timeRemaining")
    this.currentQuestionContainer = document.getElementById("currentQuestionContainer")
    this.currentQuestion = document.getElementById("currentQuestion")
    this.questionNumber = document.getElementById("questionNumber")
    this.interviewComplete = document.getElementById("interviewComplete")
    this.recordingIndicator = document.getElementById("recordingIndicator")
    this.evaluationSpinner = document.getElementById("evaluationSpinner")
    this.evaluationStatus = document.getElementById("evaluationStatus")
    this.interviewContainer = document.querySelector(".interview-container")
    this.cameraContainer = document.getElementById("cameraContainer")
    this.cameraFeed = document.getElementById("cameraFeed")
    this.transcriptDisplay = document.getElementById("transcriptDisplay")
    this.nextQuestionBtn = document.getElementById("nextQuestionBtn")
    this.resultsContainer = document.getElementById("resultsContainer")
    this.closeResultsBtn = document.getElementById("closeResultsBtn")
  }

  loadQuestions() {
    fetch("/get_questions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
    })
      .then((response) => {
        if (!response.ok) {
          throw new Error("Failed to load questions")
        }
        return response.json()
      })
      .then((data) => {
        console.log("Received data from server:", data)

        if (data.status === "success") {
          this.questions = data.questions
          console.log("Questions loaded:", this.questions)
        } else {
          console.error("Error loading questions:", data.message)
          this.showNotification("Error loading questions. Using default questions.", "warning")

          this.questions = ["Where do you see yourself in 5 years?"]
        }
      })
      .catch((error) => {
        console.error("Error fetching questions:", error)
        this.showNotification("Failed to load questions. Using default questions.", "error")

        this.questions = ["Describe a challenging project you worked on and how you overcame obstacles."]
      })

    // Get interview duration from the page
    const durationElement = document.querySelector(".duration-time")
    if (durationElement) {
      this.totalDuration = Number.parseInt(durationElement.textContent) * 60
      this.timeRemaining = this.totalDuration
    }
  }

  setupEventListeners() {
    if (this.startInterviewBtn) {
      this.startInterviewBtn.addEventListener("click", () => this.startInterview())
    }

    if (this.speakingBtn) {
      this.speakingBtn.addEventListener("click", () => this.toggleSpeaking())
    }

    if (this.nextQuestionBtn) {
      this.nextQuestionBtn.addEventListener("click", () => this.nextQuestion())
    }

    if (this.closeResultsBtn) {
      this.closeResultsBtn.addEventListener("click", () => this.closeResults())
    }

    // Prevent context menu and certain key combinations during interview
    document.addEventListener("contextmenu", (e) => {
      if (this.isInterviewActive) {
        e.preventDefault()
      }
    })

    document.addEventListener("keydown", (e) => {
      if (this.isInterviewActive) {
        this.handleKeyPress(e)
      }
    })

    // Handle fullscreen change events
    document.addEventListener("fullscreenchange", () => this.handleFullscreenChange())
    document.addEventListener("webkitfullscreenchange", () => this.handleFullscreenChange())
    document.addEventListener("mozfullscreenchange", () => this.handleFullscreenChange())
    document.addEventListener("MSFullscreenChange", () => this.handleFullscreenChange())
  }

  async startInterview() {
    try {
      // Request microphone and camera permissions
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: true,
        video: true,
      })

      // Start camera feed
      await this.startCamera(stream)

      // Enter fullscreen
      await this.enterFullscreen()

      // Start interview
      this.isInterviewActive = true
      document.body.classList.add("interview-active")

      // Hide start button and show controls
      this.startInterviewBtn.style.display = "none"
      this.speakingBtn.disabled = false
      this.currentQuestionContainer.style.display = "block"

      // Start timer
      this.startTimer()

      // Show first question and read it aloud
      this.showCurrentQuestion()

      // Update AI status
      const aiStatus = document.querySelector(".ai-status")
      if (aiStatus) {
        aiStatus.textContent = "Interview in Progress"
      }

      // Show success message
      this.showNotification("Interview started successfully! Camera and microphone are active.", "success")
    } catch (error) {
      console.error("Error starting interview:", error)
      let errorMessage = "Unable to access camera and microphone. "

      if (error.name === "NotAllowedError") {
        errorMessage += "Please allow camera and microphone access to continue."
      } else if (error.name === "NotFoundError") {
        errorMessage += "No camera or microphone found. Please check your devices."
      } else {
        errorMessage += "Please check your camera and microphone settings."
      }

      this.showNotification(errorMessage, "error")
    }
  }

  async startCamera(stream) {
    try {
      this.cameraStream = stream

      // Set up camera feed
      if (this.cameraFeed) {
        this.cameraFeed.srcObject = stream
        this.cameraContainer.style.display = "block"

        // Wait for video to load
        await new Promise((resolve) => {
          this.cameraFeed.onloadedmetadata = resolve
        })

        await this.cameraFeed.play()
      }
    } catch (error) {
      console.error("Error starting camera:", error)
      throw error
    }
  }

  async stopCamera() {
    if (this.cameraStream) {
      // Stop all tracks
      this.cameraStream.getTracks().forEach((track) => {
        track.stop()
      })

      // Clear camera feed
      if (this.cameraFeed) {
        this.cameraFeed.srcObject = null
      }

      // Hide camera container
      if (this.cameraContainer) {
        this.cameraContainer.style.display = "none"
      }

      this.cameraStream = null
    }
  }

  async toggleSpeaking() {
    if (!this.isRecording) {
      await this.startRecording()
    } else {
      await this.stopRecording()
    }
  }

  async startRecording() {
    try {
      if (!("webkitSpeechRecognition" in window || "SpeechRecognition" in window)) {
        this.showNotification("Speech Recognition not supported in this browser.", "error")
        return
      }

      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition
      this.recognition = new SpeechRecognition()
      this.recognition.lang = "en-US"
      this.recognition.continuous = true // Keep recording continuously
      this.recognition.interimResults = true // Show interim results

      this.currentTranscript = ""

      this.recognition.onstart = () => {
        this.isRecording = true
        this.speakingBtn.innerHTML = '<i class="fas fa-stop"></i> Stop Speaking'
        this.speakingBtn.classList.remove("btn-primary")
        this.speakingBtn.classList.add("btn-danger")
        this.recordingIndicator.style.display = "flex"
        this.transcriptDisplay.style.display = "block"
        this.nextQuestionBtn.style.display = "inline-block"
      }

      this.recognition.onerror = (event) => {
        console.error("Speech recognition error:", event.error)
        if (event.error !== "no-speech") {
          this.showNotification("Speech recognition error. Please try again.", "error")
        }
      }

      this.recognition.onresult = (event) => {
        let interimTranscript = ""
        let finalTranscript = ""

        for (let i = event.resultIndex; i < event.results.length; i++) {
          const transcript = event.results[i][0].transcript
          if (event.results[i].isFinal) {
            finalTranscript += transcript
          } else {
            interimTranscript += transcript
          }
        }

        this.currentTranscript = finalTranscript + interimTranscript
        this.updateTranscriptDisplay()
      }


      this.recognition.onend = () => {
        // Only restart if we're still supposed to be recording
        if (this.isRecording) {
          setTimeout(() => {
            if (this.isRecording) {
              this.recognition.start()
            }
          }, 100)
        }
      }

      this.recognition.start()
    } catch (error) {
      console.error("Error using SpeechRecognition:", error)
      this.showNotification("Unable to start speech recognition.", "error")
    }
  }

  async stopRecording() {
    if (this.recognition && this.isRecording) {
      this.isRecording = false
      this.recognition.stop()

      this.speakingBtn.innerHTML = '<i class="fas fa-microphone"></i> Start Speaking'
      this.speakingBtn.classList.remove("btn-danger")
      this.speakingBtn.classList.add("btn-primary")
      this.recordingIndicator.style.display = "none"
    }
  }

  updateTranscriptDisplay() {
    if (this.transcriptDisplay) {
      this.transcriptDisplay.innerHTML = `
                <div class="transcript-content">
                    <strong>Your Response:</strong><br>
                    ${this.currentTranscript || "<em>Start speaking...</em>"}
                </div>
            `
    }
    this.curren
  }

  showCurrentQuestion() {
    if (this.currentQuestionIndex < this.questions.length) {
      const question = this.questions[this.currentQuestionIndex]
      this.currentQuestion.textContent = question
      this.questionNumber.textContent = this.currentQuestionIndex + 1

      // Read the question aloud
      this.readQuestionAloud(question)

      // Clear transcript display
      this.currentTranscript = ""
      this.updateTranscriptDisplay()

      // Hide next question button initially
      if (this.nextQuestionBtn) {
        this.nextQuestionBtn.style.display = "none"
      }
    }
  }

  readQuestionAloud(question) {
    // Stop any ongoing speech
    this.speechSynthesis.cancel()

    // Create speech utterance
    const utterance = new SpeechSynthesisUtterance(question)
    utterance.rate = 0.9
    utterance.pitch = 1
    utterance.volume = 0.8

    // Use a professional voice if available
    const voices = this.speechSynthesis.getVoices()
    const preferredVoice = voices.find(
      (voice) => voice.name.includes("Google") || voice.name.includes("Microsoft") || voice.lang.startsWith("en"),
    )

    if (preferredVoice) {
      utterance.voice = preferredVoice
    }

    // Speak the question
    this.speechSynthesis.speak(utterance)
  }

  nextQuestion() {
    if (this.currentQuestionIndex < this.questions.length && this.currentTranscript.trim()) {
      const responseData = {
        questionIndex: this.currentQuestionIndex,
        question: this.questions[this.currentQuestionIndex],
        response: this.currentTranscript.trim(),
        timestamp: new Date().toISOString(),
      }
      
      console.log("Saving response:", responseData) // Debug log
      this.responses.push(responseData)
      
    }

    // Stop recording if active
    if (this.isRecording) {
      this.stopRecording()
    }

    this.currentQuestionIndex++
    this.currentTranscript = ""
    // this.fullTranscript = ""
    this.updateTranscriptDisplay()


    if (this.currentQuestionIndex < this.questions.length) {
      // Show next question
      this.showCurrentQuestion()
      this.showNotification(`Question ${this.currentQuestionIndex + 1} of ${this.questions.length}`, "info")
    } else {
      // Interview complete - all questions finished
      this.completeInterview()
    }
  }

  startTimer() {
    this.timerInterval = setInterval(() => {
      this.timeRemaining--
      this.updateTimerDisplay()

      if (this.timeRemaining <= 0) {
        // Time expired - complete interview
        this.completeInterview()
      }
    }, 1000)
  }

  updateTimerDisplay() {
    const minutes = Math.floor(this.timeRemaining / 60)
    const seconds = this.timeRemaining % 60
    const timeString = `${minutes}:${seconds.toString().padStart(2, "0")}`

    this.timerDisplay.textContent = timeString

    // Change color based on time remaining
    const timerElement = document.getElementById("timerDisplay")
    if (this.timeRemaining <= 60) {
      timerElement.classList.add("danger")
      timerElement.classList.remove("warning")
    } else if (this.timeRemaining <= 300) {
      timerElement.classList.add("warning")
      timerElement.classList.remove("danger")
    }
  }

  async completeInterview() {
    // Save final response if there's any and we haven't exceeded questions
    if (this.currentQuestionIndex < this.questions.length && this.currentTranscript.trim()) {
      const responseData = {
        questionIndex: this.currentQuestionIndex,
        question: this.questions[this.currentQuestionIndex],
        response: this.currentTranscript.trim(),
        timestamp: new Date().toISOString(),
      }

      console.log("Saving final response:", responseData) // Debug log
      this.responses.push(responseData)
    }

    // Stop recording if active
    if (this.isRecording) {
      await this.stopRecording()
    }

    // Stop timer
    if (this.timerInterval) {
      clearInterval(this.timerInterval)
    }

    // Stop speech synthesis
    this.speechSynthesis.cancel()

    // Hide current question and show completion screen
    this.currentQuestionContainer.style.display = "none"
    this.interviewComplete.style.display = "block"

    // Update AI status
    const aiStatus = document.querySelector(".ai-status")
    if (aiStatus) {
      aiStatus.textContent = "Interview Completed"
    }

    // Send responses to backend and redirect to results page
    await this.submitResponses()
  }

  async submitResponses() {
    try {
      // Filter out any invalid responses and validate data structure
      const validResponses = this.responses.filter((response) => {
        const isValid =
          response &&
          typeof response.question === "string" &&
          typeof response.response === "string" &&
          response.question.trim() !== "" &&
          response.response.trim() !== ""

        if (!isValid) {
          console.warn("Invalid response filtered out:", response)
        }

        return isValid
      })

      console.log("Submitting valid responses:", validResponses) // Debug log
      console.log("Total valid responses:", validResponses.length) // Debug log

      // Send as JSON
      const response = await fetch("/submit_interview_responses", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          responses: validResponses,
        }),
      })

      if (response.ok) {
        const result = await response.json()
        console.log("Response submitted successfully:", result) // Debug log

        // Stop camera and cleanup
        await this.stopCamera()
        this.speechSynthesis.cancel()
        this.isInterviewActive = false
        document.body.classList.remove("interview-active")
        await this.exitFullscreen()

        // Redirect to results page
        if (result.redirect_url) {
          window.location.href = result.redirect_url
        } else {
          window.location.href = "/interview_results"
        }
      } else {
        const errorText = await response.text()
        console.error("Failed to submit responses:", errorText) // Debug log
        this.evaluationSpinner.style.display = "none"
        this.evaluationStatus.textContent = "Error submitting responses. Redirecting..."

        // Still redirect to results page to show error
        setTimeout(() => {
          window.location.href = "/interview_results"
        }, 2000)
      }
    } catch (error) {
      console.error("Error submitting responses:", error)
      this.evaluationSpinner.style.display = "none"
      this.evaluationStatus.textContent = "Error submitting responses. Redirecting..."

      // Still redirect to results page to show error
      setTimeout(() => {
        window.location.href = "/interview_results"
      }, 2000)
    }
  }

  async enterFullscreen() {
    try {
      if (document.documentElement.requestFullscreen) {
        await document.documentElement.requestFullscreen()
      } else if (document.documentElement.webkitRequestFullscreen) {
        await document.documentElement.webkitRequestFullscreen()
      } else if (document.documentElement.msRequestFullscreen) {
        await document.documentElement.msRequestFullscreen()
      }

      document.body.classList.add("fullscreen-mode")
    } catch (error) {
      console.error("Error entering fullscreen:", error)
      this.showNotification("Unable to enter fullscreen mode", "warning")
    }
  }

  async exitFullscreen() {
    try {
      if (document.exitFullscreen) {
        await document.exitFullscreen()
      } else if (document.webkitExitFullscreen) {
        await document.webkitExitFullscreen()
      } else if (document.msExitFullscreen) {
        await document.msExitFullscreen()
      }

      document.body.classList.remove("fullscreen-mode")
    } catch (error) {
      console.error("Error exiting fullscreen:", error)
    }
  }

  handleFullscreenChange() {
    const isFullscreen = !!(
      document.fullscreenElement ||
      document.webkitFullscreenElement ||
      document.mozFullScreenElement ||
      document.msFullscreenElement
    )

    if (!isFullscreen && this.isInterviewActive) {
      // User exited fullscreen during interview - re-enter
      setTimeout(() => {
        this.enterFullscreen()
      }, 100)
    }
  }

  handleKeyPress(e) {
    // Disable common keyboard shortcuts during interview
    const disabledKeys = [
      "F5",
      "F11",
      "F12", // Function keys
      "Tab",
      "Alt",
      "Control",
      "Meta",
      "Escape", // Modifier keys
    ]

    const disabledCombinations = [
      { ctrl: true, key: "r" }, // Ctrl+R (refresh)
      { ctrl: true, key: "w" }, // Ctrl+W (close tab)
      { ctrl: true, key: "t" }, // Ctrl+T (new tab)
      { ctrl: true, key: "n" }, // Ctrl+N (new window)
      { ctrl: true, shift: true, key: "i" }, // Ctrl+Shift+I (dev tools)
      { ctrl: true, shift: true, key: "j" }, // Ctrl+Shift+J (console)
      { ctrl: true, key: "u" }, // Ctrl+U (view source)
      { alt: true, key: "F4" }, // Alt+F4 (close window)
      { alt: true, key: "Tab" }, // Alt+Tab (switch windows)
    ]

    // Check for disabled keys
    if (disabledKeys.includes(e.key)) {
      e.preventDefault()
      return false
    }

    // Check for disabled combinations
    for (const combo of disabledCombinations) {
      if (
        combo.ctrl &&
        e.ctrlKey &&
        (combo.shift ? e.shiftKey : !e.shiftKey) &&
        (combo.alt ? e.altKey : !e.altKey) &&
        e.key.toLowerCase() === combo.key.toLowerCase()
      ) {
        e.preventDefault()
        return false
      }
    }
  }

  showNotification(message, type = "info") {
    // Create notification element
    const notification = document.createElement("div")
    notification.className = `alert alert-${type === "error" ? "danger" : type} notification`
    notification.style.cssText = `
            position: fixed;
            top: 20px;
            left: 50%;
            transform: translateX(-50%);
            z-index: 10000;
            min-width: 300px;
            text-align: center;
            animation: slideDown 0.3s ease;
        `
    notification.textContent = message

    document.body.appendChild(notification)

    // Remove after 3 seconds
    setTimeout(() => {
      notification.style.animation = "slideUp 0.3s ease"
      setTimeout(() => {
        if (notification.parentNode) {
          notification.parentNode.removeChild(notification)
        }
      }, 300)
    }, 3000)
  }
}

// Add CSS for notifications
const style = document.createElement("style")
style.textContent = `
    @keyframes slideDown {
        from { transform: translateX(-50%) translateY(-100%); opacity: 0; }
        to { transform: translateX(-50%) translateY(0); opacity: 1; }
    }
    
    @keyframes slideUp {
        from { transform: translateX(-50%) translateY(0); opacity: 1; }
        to { transform: translateX(-50%) translateY(-100%); opacity: 0; }
    }
`
document.head.appendChild(style)

// Initialize the AI Interview when the page loads
document.addEventListener("DOMContentLoaded", () => {
  if (document.querySelector(".interview-container")) {
    new AIInterview()
  }
})