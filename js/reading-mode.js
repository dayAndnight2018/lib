/**
 * 阅读/背诵模式功能模块
 * 使用浏览器的SpeechRecognition API实现语音识别和文字匹配
 */
(function () {
    // 检查浏览器是否支持SpeechRecognition API
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    const isSpeechRecognitionSupported = !!SpeechRecognition;
    
    if (!isSpeechRecognitionSupported) {
        console.warn('当前浏览器不支持语音识别功能');
        return;
    }
    
    // 全局状态变量
    window.readingMode = {
        isActive: false,
        isRecitationMode: false,
        recognition: null,
        currentIndex: 0,
        textContent: [],
        highlightedIndex: 0,
        isMatching: false,
        matchTimeout: null,
        progress: 0
    };
    
    // 创建语音识别实例
    function createRecognition() {
        const recognition = new SpeechRecognition();
        recognition.continuous = true;
        recognition.interimResults = true;
        recognition.lang = 'zh-CN'; // 设置为中文
        
        return recognition;
    }
    
    // 初始化文本内容，将markdown内容转换为可匹配的文本数组
    function initTextContent() {
        const markdownSection = document.querySelector('.markdown-section');
        if (!markdownSection) return [];
        
        // 获取所有文本元素
        const textElements = markdownSection.querySelectorAll('p, h1, h2, h3, h4, h5, h6, li');
        const textContent = [];
        
        textElements.forEach(element => {
            const text = element.textContent.trim();
            if (text) {
                // 按句子分割文本
                const sentences = text.split(/[。！？；：]/).filter(s => s.trim());
                sentences.forEach(sentence => {
                    if (sentence.trim()) {
                        textContent.push({
                            text: sentence.trim() + '。',
                            element: element
                        });
                    }
                });
            }
        });
        
        return textContent;
    }
    
    // 开始阅读模式
    function startReadingMode() {
        if (window.readingMode.isActive) return;
        
        // 初始化文本内容
        window.readingMode.textContent = initTextContent();
        if (window.readingMode.textContent.length === 0) {
            alert('没有找到可阅读的内容');
            return;
        }
        
        // 创建语音识别实例
        window.readingMode.recognition = createRecognition();
        
        // 添加语音识别事件监听器
        window.readingMode.recognition.onresult = handleRecognitionResult;
        window.readingMode.recognition.onerror = handleRecognitionError;
        window.readingMode.recognition.onend = handleRecognitionEnd;
        
        // 开始语音识别
        window.readingMode.recognition.start();
        
        // 更新状态
        window.readingMode.isActive = true;
        window.readingMode.isRecitationMode = false;
        window.readingMode.currentIndex = 0;
        window.readingMode.highlightedIndex = 0;
        window.readingMode.progress = 0;
        
        // 添加阅读模式样式
        addReadingModeCSS();
        
        // 高亮第一个句子
        highlightCurrentSentence();
        
        // 显示进度条
        showProgressBar();
        
        console.log('阅读模式已启动');
    }
    
    // 开始背诵模式
    function startRecitationMode() {
        if (window.readingMode.isActive) return;
        
        // 初始化文本内容
        window.readingMode.textContent = initTextContent();
        if (window.readingMode.textContent.length === 0) {
            alert('没有找到可背诵的内容');
            return;
        }
        
        // 创建语音识别实例
        window.readingMode.recognition = createRecognition();
        
        // 添加语音识别事件监听器
        window.readingMode.recognition.onresult = handleRecognitionResult;
        window.readingMode.recognition.onerror = handleRecognitionError;
        window.readingMode.recognition.onend = handleRecognitionEnd;
        
        // 开始语音识别
        window.readingMode.recognition.start();
        
        // 更新状态
        window.readingMode.isActive = true;
        window.readingMode.isRecitationMode = true;
        window.readingMode.currentIndex = 0;
        window.readingMode.highlightedIndex = 0;
        window.readingMode.progress = 0;
        
        // 添加阅读模式样式
        addReadingModeCSS();
        
        // 高亮第一个句子
        highlightCurrentSentence();
        
        // 显示进度条
        showProgressBar();
        
        console.log('背诵模式已启动');
    }
    
    // 停止阅读/背诵模式
    function stopReadingMode() {
        if (!window.readingMode.isActive) return;
        
        // 停止语音识别
        if (window.readingMode.recognition) {
            window.readingMode.recognition.stop();
            window.readingMode.recognition = null;
        }
        
        // 清除超时
        if (window.readingMode.matchTimeout) {
            clearTimeout(window.readingMode.matchTimeout);
            window.readingMode.matchTimeout = null;
        }
        
        // 清除高亮
        clearAllHighlights();
        
        // 隐藏进度条
        hideProgressBar();
        
        // 更新状态
        window.readingMode.isActive = false;
        window.readingMode.isRecitationMode = false;
        
        console.log('阅读/背诵模式已停止');
    }
    
    // 处理语音识别结果
    function handleRecognitionResult(event) {
        const results = event.results;
        const lastResult = results[results.length - 1];
        const transcript = lastResult[0].transcript.trim();
        const isFinal = lastResult.isFinal;
        
        // 只处理最终结果
        if (!isFinal) return;
        
        console.log('识别结果:', transcript);
        
        // 匹配当前句子
        matchCurrentSentence(transcript);
    }
    
    // 匹配当前句子
    function matchCurrentSentence(transcript) {
        const currentSentence = window.readingMode.textContent[window.readingMode.currentIndex];
        if (!currentSentence) return;
        
        // 简单的文本匹配，忽略标点和大小写
        const normalizedTranscript = transcript.replace(/[。！？；：，、]/g, '').toLowerCase();
        const normalizedSentence = currentSentence.text.replace(/[。！？；：，、]/g, '').toLowerCase();
        
        // 计算匹配度
        const matchScore = calculateMatchScore(normalizedTranscript, normalizedSentence);
        
        console.log('匹配度:', matchScore, '识别文本:', normalizedTranscript, '目标文本:', normalizedSentence);
        
        // 如果匹配度超过80%，则认为匹配成功
        if (matchScore > 0.8) {
            // 匹配成功，高亮当前句子
            highlightMatchedSentence();
            
            // 移动到下一个句子
            moveToNextSentence();
        } else {
            // 匹配失败，高亮显示错误
            highlightErrorSentence();
            
            // 在背诵模式下，如果匹配失败，暂停并等待用户重新尝试
            if (window.readingMode.isRecitationMode) {
                // 可以添加错误提示
                console.log('匹配失败，请重新尝试');
            }
        }
    }
    
    // 计算匹配度
    function calculateMatchScore(transcript, sentence) {
        // 简单的字符匹配算法
        let matchCount = 0;
        const minLength = Math.min(transcript.length, sentence.length);
        
        for (let i = 0; i < minLength; i++) {
            if (transcript[i] === sentence[i]) {
                matchCount++;
            }
        }
        
        return matchCount / sentence.length;
    }
    
    // 高亮当前句子
    function highlightCurrentSentence() {
        const currentSentence = window.readingMode.textContent[window.readingMode.currentIndex];
        if (!currentSentence) return;
        
        // 清除之前的高亮
        clearAllHighlights();
        
        // 高亮当前句子
        const element = currentSentence.element;
        element.classList.add('reading-current-sentence');
        
        // 滚动到当前句子
        scrollToElement(element);
    }
    
    // 高亮匹配成功的句子
    function highlightMatchedSentence() {
        const currentSentence = window.readingMode.textContent[window.readingMode.currentIndex];
        if (!currentSentence) return;
        
        const element = currentSentence.element;
        element.classList.remove('reading-current-sentence');
        element.classList.add('reading-matched-sentence');
    }
    
    // 高亮匹配失败的句子
    function highlightErrorSentence() {
        const currentSentence = window.readingMode.textContent[window.readingMode.currentIndex];
        if (!currentSentence) return;
        
        const element = currentSentence.element;
        element.classList.add('reading-error-sentence');
    }
    
    // 清除所有高亮
    function clearAllHighlights() {
        const elements = document.querySelectorAll('.reading-current-sentence, .reading-matched-sentence, .reading-error-sentence');
        elements.forEach(element => {
            element.classList.remove('reading-current-sentence', 'reading-matched-sentence', 'reading-error-sentence');
        });
    }
    
    // 移动到下一个句子
    function moveToNextSentence() {
        window.readingMode.currentIndex++;
        window.readingMode.highlightedIndex = window.readingMode.currentIndex;
        
        // 更新进度
        updateProgress();
        
        // 检查是否完成
        if (window.readingMode.currentIndex >= window.readingMode.textContent.length) {
            // 完成所有句子
            completeReading();
            return;
        }
        
        // 高亮下一个句子
        highlightCurrentSentence();
    }
    
    // 更新进度
    function updateProgress() {
        const total = window.readingMode.textContent.length;
        const current = window.readingMode.currentIndex;
        window.readingMode.progress = (current / total) * 100;
        
        // 更新进度条
        const progressBar = document.getElementById('reading-progress-bar');
        if (progressBar) {
            progressBar.style.width = window.readingMode.progress + '%';
        }
    }
    
    // 完成阅读
    function completeReading() {
        console.log('阅读/背诵完成');
        stopReadingMode();
        alert('阅读/背诵完成！');
    }
    
    // 滚动到元素
    function scrollToElement(element) {
        if (!element) return;
        
        const rect = element.getBoundingClientRect();
        const viewportHeight = window.innerHeight;
        
        // 计算滚动位置，确保元素在视口的上1/3处
        const targetTop = window.scrollY + rect.top - (viewportHeight * 0.3);
        
        window.scrollTo({
            top: targetTop,
            behavior: 'smooth'
        });
    }
    
    // 显示进度条
    function showProgressBar() {
        // 检查是否已经存在进度条
        if (document.getElementById('reading-progress-container')) {
            return;
        }
        
        // 创建进度条容器
        const progressContainer = document.createElement('div');
        progressContainer.id = 'reading-progress-container';
        progressContainer.className = 'reading-progress-container';
        
        // 创建进度条
        const progressBar = document.createElement('div');
        progressBar.id = 'reading-progress-bar';
        progressBar.className = 'reading-progress-bar';
        
        progressContainer.appendChild(progressBar);
        document.body.appendChild(progressContainer);
    }
    
    // 隐藏进度条
    function hideProgressBar() {
        const progressContainer = document.getElementById('reading-progress-container');
        if (progressContainer) {
            document.body.removeChild(progressContainer);
        }
    }
    
    // 处理语音识别错误
    function handleRecognitionError(event) {
        console.error('语音识别错误:', event.error);
        
        // 如果是权限错误，提示用户
        if (event.error === 'not-allowed') {
            alert('请允许浏览器访问麦克风以使用语音识别功能');
            stopReadingMode();
        }
    }
    
    // 处理语音识别结束
    function handleRecognitionEnd() {
        console.log('语音识别已结束');
        
        // 如果是意外结束，重新启动
        if (window.readingMode.isActive) {
            window.readingMode.recognition.start();
        }
    }
    
    // 添加阅读模式CSS样式
    function addReadingModeCSS() {
        // 检查是否已经添加了样式
        if (document.getElementById('reading-mode-style')) {
            return;
        }
        
        const style = document.createElement('style');
        style.id = 'reading-mode-style';
        style.textContent = `
            /* 阅读模式样式 */
            .reading-current-sentence {
                background-color: rgba(37, 99, 235, 0.2) !important;
                border-left: 4px solid #2563eb !important;
                padding: 8px 12px !important;
                border-radius: 0 4px 4px 0 !important;
                transition: all 0.3s ease !important;
            }
            
            .reading-matched-sentence {
                background-color: rgba(16, 185, 129, 0.2) !important;
                border-left: 4px solid #10b981 !important;
                padding: 8px 12px !important;
                border-radius: 0 4px 4px 0 !important;
                transition: all 0.3s ease !important;
            }
            
            .reading-error-sentence {
                background-color: rgba(239, 68, 68, 0.2) !important;
                border-left: 4px solid #ef4444 !important;
                padding: 8px 12px !important;
                border-radius: 0 4px 4px 0 !important;
                transition: all 0.3s ease !important;
            }
            
            /* 进度条样式 */
            .reading-progress-container {
                position: fixed;
                top: 0;
                left: 0;
                width: 100%;
                height: 4px;
                background-color: rgba(0, 0, 0, 0.1);
                z-index: 999999;
            }
            
            .reading-progress-bar {
                height: 100%;
                background-color: #2563eb;
                width: 0%;
                transition: width 0.3s ease;
                box-shadow: 0 0 10px rgba(37, 99, 235, 0.5);
            }
        `;
        
        document.head.appendChild(style);
    }
    
    // 切换阅读模式
    window.toggleReadingMode = function() {
        if (window.readingMode.isActive) {
            stopReadingMode();
        } else {
            startReadingMode();
        }
    };
    
    // 切换背诵模式
    window.toggleRecitationMode = function() {
        if (window.readingMode.isActive) {
            stopReadingMode();
        } else {
            startRecitationMode();
        }
    };
    
    console.log('阅读/背诵模式模块已加载');
})();
