/**
 * 语音朗读功能模块
 * 使用浏览器的SpeechSynthesis API实现文本朗读
 */
(function () {
    // 检查浏览器是否支持SpeechSynthesis API
    if (!('speechSynthesis' in window)) {
        console.warn('当前浏览器不支持语音朗读功能');
        return;
    }

    window.highlightedElements = [];

    // 创建语音朗读控制按钮
    function createSpeechControls() {
        const controls = document.createElement('div');
        controls.id = 'speech-controls';
        controls.className = 'speech-controls';

        controls.innerHTML = `
            <button id="speech-toggle" class="speech-btn speech-toggle" title="开始朗读">
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"></polygon>
                    <path d="M15.54 8.46a5 5 0 0 1 0 7.07"></path>
                    <path d="M19.07 4.93a10 10 0 0 1 0 14.14"></path>
                </svg>
            </button>
            <button id="speech-pause" class="speech-btn speech-pause" title="暂停朗读" disabled>
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <rect x="6" y="4" width="4" height="16"></rect>
                    <rect x="14" y="4" width="4" height="16"></rect>
                </svg>
            </button>
            <button id="speech-resume" class="speech-btn speech-resume" title="继续朗读" disabled>
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <polygon points="5 3 19 12 5 21 5 3"></polygon>
                </svg>
            </button>
            <button id="speech-stop" class="speech-btn speech-stop" title="停止朗读" disabled>
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
                </svg>
            </button>
            <select id="speech-voice" class="speech-voice"></select>
            <input type="range" id="speech-rate" min="0.5" max="2" step="0.1" value="1" class="speech-rate" title="语速">
            <input type="range" id="speech-pitch" min="0.5" max="2" step="0.1" value="1" class="speech-pitch" title="音调">
        `;

        document.body.appendChild(controls);
    }

    // 初始化语音列表
    function initVoices() {
        const voiceSelect = document.getElementById('speech-voice');
        const voices = speechSynthesis.getVoices();

        // 清空现有选项
        voiceSelect.innerHTML = '';

        // 优先选择中文语音
        let hasChineseVoice = false;
        let hasEnglishVoice = false;
        let selectedVoiceSet = false;

        // 检查是否有Xiaoxiao语音
        let hasXiaoxiaoVoice = false;

        // 先检查是否有Xiaoxiao语音
        voices.forEach(voice => {
            if (voice.name === 'Xiaoxiao' || voice.name.includes('晓笑')) {
                hasXiaoxiaoVoice = true;
            }
        });

        // 先添加中文语音
        voices.forEach(voice => {
            if (voice.lang.includes('zh')) {
                const option = document.createElement('option');
                option.textContent = `${voice.name} (${voice.lang})`;
                option.value = voice.name;

                // 如果存在Xiaoxiao语音，优先选择它
                if (voice.name === 'Xiaoxiao' || voice.name.includes('晓笑')) {
                    option.selected = true;
                    selectedVoiceSet = true;
                } else if (!selectedVoiceSet) {
                    option.selected = true;
                    selectedVoiceSet = true;
                }

                voiceSelect.appendChild(option);
                hasChineseVoice = true;
            }
        });

        // 检查是否有英文语音
        voices.forEach(voice => {
            if (voice.lang.includes('en')) {
                hasEnglishVoice = true;
            }
        });

        // 添加分隔线（如果有中文语音且还有英文语音）
        if (hasChineseVoice && hasEnglishVoice) {
            const separator = document.createElement('option');
            separator.disabled = true;
            separator.textContent = '-------------------';
            voiceSelect.appendChild(separator);
        }

        // 添加英文语音
        voices.forEach(voice => {
            if (voice.lang.includes('en') && !voice.lang.includes('zh')) {
                const option = document.createElement('option');
                option.textContent = `${voice.name} (${voice.lang})`;
                option.value = voice.name;

                // 如果还没有选中项，选择默认的英文语音
                if (!selectedVoiceSet && voice.default) {
                    option.selected = true;
                    selectedVoiceSet = true;
                }

                voiceSelect.appendChild(option);
            }
        });

        // 如果没有中文和英文语音，添加提示信息
        if (voiceSelect.options.length === 0) {
            const option = document.createElement('option');
            option.textContent = '没有可用的中文或英文语音';
            option.disabled = true;
            voiceSelect.appendChild(option);
        } else if (!selectedVoiceSet && voiceSelect.options.length > 0) {
            // 确保至少有一个选中项
            voiceSelect.selectedIndex = 0;
        }
    }

    // 清除所有高亮效果，恢复原始样式
    function clearHighlights() {
        try {
            // 移除高亮覆盖层
            const overlay = document.getElementById('speech-highlight-overlay');
            if (overlay && overlay.parentNode) {
                overlay.parentNode.removeChild(overlay);
            }

            if (window.highlightedElements && window.highlightedElements.length > 0) {
                window.highlightedElements.forEach(element => {
                    // 确保element是有效的DOM元素
                    if (element instanceof HTMLElement) {
                        // 恢复原始样式：清除所有可能添加的样式
                        element.style.removeProperty('font-size');
                        element.style.removeProperty('color');
                        element.style.removeProperty('font-weight');
                        element.style.removeProperty('background-color');
                        element.style.removeProperty('transition');
                        element.style.removeProperty('text-decoration');
                        element.style.removeProperty('display');
                        element.style.removeProperty('padding');
                        element.style.removeProperty('margin');
                        element.style.removeProperty('border-radius');
                        element.style.removeProperty('box-shadow');
                        element.style.removeProperty('opacity');

                        // 移除高亮类
                        element.classList.remove('speech-highlighting-active');
                    }
                });
                // 清空高亮元素数组，确保不会重复清除
                window.highlightedElements = [];
            }
            
            // 处理所有speech-marker关联的高亮元素
            if (window.sentenceElements && window.sentenceElements.length > 0) {
                window.sentenceElements.forEach(marker => {
                    // 处理多个关联的wrapper元素
                    if (marker.wrappedElements && Array.isArray(marker.wrappedElements) && marker.wrappedElements.length > 0) {
                        marker.wrappedElements.forEach(element => {
                            if (element instanceof HTMLElement) {
                                // 清除所有可能的内联样式
                                const propertiesToRemove = ['font-size', 'color', 'font-weight', 'background-color',
                                    'transition', 'text-decoration', 'display', 'padding',
                                    'margin', 'border-radius', 'box-shadow', 'opacity'];

                                propertiesToRemove.forEach(prop => {
                                    element.style.removeProperty(prop);
                                });

                                // 移除高亮类
                                element.classList.remove('speech-highlighting-active');
                            }
                        });
                    }
                    
                    // 处理单个wrapper元素（保持向后兼容）
                    if (marker.wrappedElement && marker.wrappedElement instanceof HTMLElement) {
                        const propertiesToRemove = ['font-size', 'color', 'font-weight', 'background-color',
                            'transition', 'text-decoration', 'display', 'padding',
                            'margin', 'border-radius', 'box-shadow', 'opacity'];

                        propertiesToRemove.forEach(prop => {
                            marker.wrappedElement.style.removeProperty(prop);
                        });

                        // 移除高亮类
                        marker.wrappedElement.classList.remove('speech-highlighting-active');
                    }
                });
            }

            // 额外安全检查：清除页面上所有可能遗漏的高亮类
            document.querySelectorAll('.speech-highlighting-active').forEach(el => {
                if (el instanceof HTMLElement) {
                    // 清除所有可能的内联样式
                    const propertiesToRemove = ['font-size', 'color', 'font-weight', 'background-color',
                        'transition', 'text-decoration', 'display', 'padding',
                        'margin', 'border-radius', 'box-shadow', 'opacity'];

                    propertiesToRemove.forEach(prop => {
                        el.style.removeProperty(prop);
                    });

                    // 移除高亮类
                    el.classList.remove('speech-highlighting-active');
                }
            });
        } catch (error) {
            console.error('清除高亮出错:', error);
        }
    }

    // 添加自动滚动到元素的函数
    function scrollToElement(element) {
        if (!element || !(element instanceof HTMLElement)) return;

        try {
            // 获取元素位置信息
            const rect = element.getBoundingClientRect();
            const viewportHeight = window.innerHeight;
            const viewportWidth = window.innerWidth;

            // 计算滚动位置，确保元素在视口的上1/3处，这样用户可以看到后面的内容
            const targetTop = window.scrollY + rect.top - (viewportHeight * 0.3);
            const targetLeft = window.scrollX + rect.left - (viewportWidth * 0.5);

            // 使用平滑滚动
            window.scrollTo({
                top: targetTop,
                left: targetLeft,
                behavior: 'smooth'
            });
        } catch (error) {
            console.error('滚动到元素时出错:', error);
        }
    }


    // 添加高亮CSS样式
    function addHighlightCSS() {
        // 检查是否已经添加了样式，避免重复添加
        if (!document.getElementById('speech-highlight-style')) {
            const style = document.createElement('style');
            style.id = 'speech-highlight-style';
            style.textContent = `
                /* 闪烁动画关键帧 */
                @keyframes speech-pulse {
                    0%, 100% {
                        opacity: 1;
                        box-shadow: 0 0 10px rgba(255, 0, 0, 0.6);
                    }
                    50% {
                        opacity: 0.7;
                        box-shadow: 0 0 20px rgba(255, 0, 0, 0.8);
                    }
                }
                
                /* 极高优先级的高亮样式，针对docsify页面优化 */
                .markdown-section .speech-highlighting-active,
                .markdown-section .speech-highlighting-active * {
                    font-size: 1.1em !important;
                    color: #ff0000 !important;
                    font-weight: bold !important;
                    background-color: rgba(255, 255, 0, 0.4) !important;
                    transition: all 0.3s ease !important;
                    text-decoration: underline !important;
                    display: inline-block !important;
                    padding: 2px 4px !important;
                    margin: -2px -4px !important;
                    border-radius: 3px !important;
                    box-shadow: 0 0 8px rgba(255, 165, 0, 0.5) !important;
                    animation: speech-pulse 1.5s infinite !important;
                }
                
                /* 特别针对markdown-section中的各种元素 */
                .markdown-section p .speech-highlighting-active,
                .markdown-section strong .speech-highlighting-active,
                .markdown-section li .speech-highlighting-active,
                .markdown-section h1 .speech-highlighting-active,
                .markdown-section h2 .speech-highlighting-active,
                .markdown-section h3 .speech-highlighting-active,
                .markdown-section h4 .speech-highlighting-active,
                .markdown-section h5 .speech-highlighting-active,
                .markdown-section h6 .speech-highlighting-active {
                    font-size: 1.1em !important;
                    color: #ff0000 !important;
                    font-weight: bold !important;
                    background-color: rgba(255, 255, 0, 0.4) !important;
                    animation: speech-pulse 1.5s infinite !important;
                }
                
                /* 高亮覆盖层样式 */
                #speech-highlight-overlay {
                    position: absolute;
                    z-index: 9999 !important;
                    background-color: rgba(255, 255, 0, 0.5) !important;
                    border: 2px solid #ff0000 !important;
                    border-radius: 4px !important;
                    pointer-events: none !important;
                    transition: all 0.3s ease !important;
                    box-shadow: 0 0 10px rgba(255, 0, 0, 0.6) !important;
                    padding: 2px !important;
                    animation: speech-pulse 1.5s infinite !important;
                }
                
                /* 确保高亮在各种嵌套结构中都能正确显示 */
                .markdown-section pre code .speech-highlighting-active,
                .markdown-section blockquote .speech-highlighting-active,
                .markdown-section table .speech-highlighting-active {
                    color: #ff0000 !important;
                    background-color: rgba(255, 255, 0, 0.6) !important;
                    font-weight: bold !important;
                    animation: speech-pulse 1.5s infinite !important;
                }
            `;
            document.head.appendChild(style);
        }
    }

    // 高亮显示当前朗读的文本 - 适配新的speechQueue结构
    function highlightCurrentElement(index) {
        // 确保高亮CSS已添加
        addHighlightCSS();
        // 确保window.highlightedElements已初始化
        if (!window.highlightedElements) {
            window.highlightedElements = [];
        }
        // 先清除之前的高亮
        clearHighlights();

        try {
            // 确保索引有效
            if (typeof index !== 'number' || isNaN(index)) {
                console.warn('无效的索引类型:', index);
                return false;
            }

            // 高亮样式应用的辅助函数
            function applyHighlightStyle(targetElement, source) {
                // 检查元素是否在markdown-section中
                const isInMarkdownSection = targetElement.closest('.markdown-section') !== null;
                
                // 应用高亮样式
                const fontSize = isInMarkdownSection ? '1em' : '1.1em';
                const bgColor = isInMarkdownSection ? 'rgba(255, 255, 0, 0.3)' : 'rgba(255, 255, 0, 0.2)';
                
                targetElement.style.setProperty('font-size', fontSize, 'important');
                targetElement.style.setProperty('color', '#ff0000', 'important');
                targetElement.style.setProperty('font-weight', 'bold', 'important');
                targetElement.style.setProperty('background-color', bgColor, 'important');
                targetElement.style.setProperty('transition', 'all 0.1s ease', 'important');
                targetElement.style.setProperty('text-decoration', 'none', 'important');
                
                targetElement.classList.add('speech-highlighting-active');
                window.highlightedElements.push(targetElement);
                scrollToElement(targetElement);
                
                console.log(`已成功使用${source}作为后备进行高亮:`, targetElement);
            }
            
            // 应用多个元素的高亮样式
            function applyHighlightToMultipleElements(elements, source) {
                if (!elements || elements.length === 0) return false;
                
                let success = false;
                elements.forEach((element, i) => {
                    if (element && element instanceof HTMLElement && document.body.contains(element)) {
                        applyHighlightStyle(element, `${source}[${i}]`);
                        success = true;
                    }
                });
                
                return success;
            }

            // 优先使用speechQueue中的DOM元素信息（新方式）
            // 使用currentSegmentIndex作为当前朗读项的索引，忽略传入的index参数
            if (window.speechQueue && window.speechQueue.length > 0) {
                console.log('使用speechQueue中的DOM元素进行高亮');
                // 使用currentSegmentIndex获取当前朗读项
                const speechItem = window.speechQueue[window.currentSegmentIndex];
                
                if (!speechItem) {
                    console.warn('当前索引', window.currentSegmentIndex, '在speechQueue中不存在对应的朗读项');
                    return false;
                }
                
                // 首先检查是否有多个元素需要高亮（wrappedElements）
                // 从marker.allHighlightElements或speechItem.wrappedElements获取
                let elementsToHighlight = [];
                
                // 尝试从marker中获取allHighlightElements
                if (speechItem.marker && speechItem.marker.allHighlightElements && speechItem.marker.allHighlightElements.length > 0) {
                    elementsToHighlight = speechItem.marker.allHighlightElements;
                }
                // 如果没有，尝试从speechItem获取wrappedElements
                else if (speechItem.wrappedElements && speechItem.wrappedElements.length > 0) {
                    elementsToHighlight = speechItem.wrappedElements;
                }
                // 最后的尝试：如果speechItem是marker本身，直接使用其wrappedElements
                else if (speechItem.wrappedElements && speechItem.wrappedElements.length > 0) {
                    elementsToHighlight = speechItem.wrappedElements;
                }
                
                // 如果找到元素，应用高亮
                if (elementsToHighlight.length > 0) {
                    console.log('发现多个需要高亮的元素，数量:', elementsToHighlight.length);
                    const highlightSuccess = applyHighlightToMultipleElements(elementsToHighlight, 'multiElementHighlight');
                    if (highlightSuccess) {
                        return true;
                    }
                }
                
                // 确保wrappedElement存在，这是要高亮显示的元素
                const target = speechItem.wrappedElement;
                
                if (!target) {
                    console.warn('当前朗读项缺少有效的wrappedElement:', speechItem);
                    
                    // 在wrappedElement不存在时，尝试使用wrappedElements作为后备
                    if (speechItem.wrappedElements && speechItem.wrappedElements.length > 0) {
                        console.log('尝试使用wrappedElements作为wrappedElement的后备');
                        const highlightSuccess = applyHighlightToMultipleElements(speechItem.wrappedElements, 'fallback.wrappedElements');
                        if (highlightSuccess) {
                            return true;
                        }
                    }
                    
                    // 尝试使用其他后备元素
                    if (speechItem.fallbackElement && document.body.contains(speechItem.fallbackElement)) {
                        console.log('使用speechItem.fallbackElement作为后备高亮元素');
                        applyHighlightStyle(speechItem.fallbackElement, 'fallbackElement');
                        return true;
                    }
                    
                    // 其次尝试使用element作为后备
                    if (speechItem.element && document.body.contains(speechItem.element)) {
                        console.log('使用element作为后备高亮元素');
                        applyHighlightStyle(speechItem.element, 'element');
                        return true;
                    }
                    
                    // 最后尝试使用originalElement作为后备
                    if (speechItem.originalElement && document.body.contains(speechItem.originalElement)) {
                        console.log('使用originalElement作为后备高亮元素');
                        applyHighlightStyle(speechItem.originalElement, 'originalElement');
                        return true;
                    }
                    
                    return false;
                }
                
                if (target) {
                    // 确保target在文档中
                    if (!document.body.contains(target)) {
                        console.warn(`目标元素不在文档中，尝试使用后备方案，索引: ${speechItem.index}`);
                        
                        // 在target不在文档中时，先尝试使用wrappedElements
                        if (speechItem.wrappedElements && speechItem.wrappedElements.length > 0) {
                            console.log('目标元素不在文档中，尝试使用wrappedElements作为后备');
                            const highlightSuccess = applyHighlightToMultipleElements(speechItem.wrappedElements, 'missingTarget.wrappedElements');
                            if (highlightSuccess) {
                                return true;
                            }
                        }
                        
                        // 优先尝试使用fallbackElement（如果存在且在文档中）
                        if (speechItem.fallbackElement && document.body.contains(speechItem.fallbackElement)) {
                            console.log('使用speechItem.fallbackElement作为后备高亮元素');
                            applyHighlightStyle(speechItem.fallbackElement, 'fallbackElement');
                            return true;
                        }
                        
                        // 其次尝试使用element作为后备
                        if (speechItem.element && document.body.contains(speechItem.element)) {
                            console.log('使用element作为后备高亮元素');
                            applyHighlightStyle(speechItem.element, 'element');
                            return true;
                        }
                        
                        // 最后尝试使用originalElement作为后备
                        if (speechItem.originalElement && document.body.contains(speechItem.originalElement)) {
                            console.log('使用originalElement作为后备高亮元素');
                            applyHighlightStyle(speechItem.originalElement, 'originalElement');
                            return true;
                        }
                        
                        // 尝试查找最近的有效父元素
                        console.log('尝试查找有效的父元素作为最后后备');
                        let finalFallback = null;
                        
                        // 尝试从所有可能的元素引用向上查找
                        const allElements = [speechItem.element, speechItem.wrappedElement, speechItem.originalElement].filter(el => el);
                        for (const el of allElements) {
                            let current = el;
                            while (current.parentNode && !document.body.contains(current)) {
                                current = current.parentNode;
                            }
                            if (document.body.contains(current)) {
                                finalFallback = current;
                                break;
                            }
                        }
                        
                        if (finalFallback) {
                            console.log('找到有效父元素作为最后后备:', finalFallback.tagName);
                            applyHighlightStyle(finalFallback, 'parentElement');
                            return true;
                        }
                        
                        // 最终极的后备方案：尝试查找当前文档中的任何可见文本元素
                        console.log('尝试终极后备方案：查找可见文本元素');
                        
                        // 1. 尝试直接使用markdown-section作为最后的后备
                        const markdownSection = document.querySelector('.markdown-section');
                        if (markdownSection && document.body.contains(markdownSection)) {
                            console.log('使用markdown-section作为终极后备高亮元素');
                            applyHighlightStyle(markdownSection, 'markdownSection');
                            return true;
                        }
                        
                        // 2. 尝试从可见区域查找任何文本元素
                        const visibleTextElements = Array.from(document.querySelectorAll('p, span, div, h1, h2, h3, h4, h5, h6, li')).filter(el => {
                            return el.textContent.trim().length > 0 && 
                                   document.body.contains(el) && 
                                   isElementInViewport(el);
                        });
                        
                        if (visibleTextElements.length > 0) {
                            console.log('找到可见文本元素作为终极后备');
                            applyHighlightStyle(visibleTextElements[0], 'visibleTextElement');
                            return true;
                        }
                        
                        // 3. 尝试使用body作为最后的后备
                        if (document.body) {
                            console.log('使用body作为最后的后备高亮元素');
                            applyHighlightStyle(document.body, 'documentBody');
                            return true;
                        }
                        
                        console.error('所有后备方案均失败，无法找到有效的高亮元素');
                        return false;
                    }

                    // 检查元素是否在markdown-section中
                    const isInMarkdownSection = target.closest('.markdown-section') !== null;

                    // 根据元素类型和位置调整高亮样式参数
                    const fontSize = isInMarkdownSection ? '1em' : '1.1em';
                    const bgColor = isInMarkdownSection ? 'rgba(255, 255, 0, 0.3)' : 'rgba(255, 255, 0, 0.2)';

                    // 清除目标元素上可能存在的任何冲突样式
                    const conflictingStyles = ['font-size', 'color', 'font-weight', 'background-color',
                        'transition', 'text-decoration'];
                    conflictingStyles.forEach(style => {
                        target.style.removeProperty(style);
                    });

                    // 应用文字级别高亮样式
                    target.style.setProperty('font-size', fontSize, 'important');
                    target.style.setProperty('color', '#ff0000', 'important');
                    target.style.setProperty('font-weight', 'bold', 'important');
                    target.style.setProperty('background-color', bgColor, 'important');
                    target.style.setProperty('transition', 'all 0.1s ease', 'important');
                    target.style.setProperty('text-decoration', 'none', 'important');

                    // 添加CSS类作为额外保障
                    target.classList.add('speech-highlighting-active');

                    // 记录高亮的元素
                    window.highlightedElements.push(target);

                    // 自动滚动到高亮元素
                    scrollToElement(target);
                    
                    // 同时检查并高亮可能存在的其他相关元素
                    if (speechItem.wrappedElements && speechItem.wrappedElements.length > 0) {
                        console.log('同时高亮其他相关元素');
                        applyHighlightToMultipleElements(speechItem.wrappedElements.filter(el => el !== target), 'additionalElements');
                    }
                    
                    console.log('已成功高亮speechQueue中的元素:', target);
                    return true;
                }
            }
            
            // 后备方案：使用原始的sentenceElements（保持向后兼容）
            if (!window.sentenceElements) {
                console.warn('sentenceElements未初始化');
                return false;
            }

            if (index >= 0 && index < window.sentenceElements.length) {
                const marker = window.sentenceElements[index];

                // 应用高亮样式的辅助函数（兼容模式）
                function applyHighlightStyle(targetElement, source) {
                    // 检查元素是否在markdown-section中
                    const isInMarkdownSection = targetElement.closest('.markdown-section') !== null;
                    
                    // 应用高亮样式
                    const fontSize = isInMarkdownSection ? '1em' : '1.1em';
                    const bgColor = isInMarkdownSection ? 'rgba(255, 255, 0, 0.3)' : 'rgba(255, 255, 0, 0.2)';
                    
                    targetElement.style.setProperty('font-size', fontSize, 'important');
                    targetElement.style.setProperty('color', '#ff0000', 'important');
                    targetElement.style.setProperty('font-weight', 'bold', 'important');
                    targetElement.style.setProperty('background-color', bgColor, 'important');
                    targetElement.style.setProperty('transition', 'all 0.1s ease', 'important');
                    targetElement.style.setProperty('text-decoration', 'none', 'important');
                    
                    targetElement.classList.add('speech-highlighting-active');
                    window.highlightedElements.push(targetElement);
                    scrollToElement(targetElement);
                    
                    console.log(`已成功在兼容模式下使用${source}进行高亮:`, targetElement);
                }
                
                // 应用多个元素的高亮样式（兼容模式）
                function applyHighlightToMultipleElements(elements, source) {
                    if (!elements || elements.length === 0) return false;
                    
                    let success = false;
                    elements.forEach((element, i) => {
                        if (element && element instanceof HTMLElement && document.body.contains(element)) {
                            applyHighlightStyle(element, `${source}[${i}]`);
                            success = true;
                        }
                    });
                    
                    return success;
                }
                
                // 首先检查marker是否有多个元素需要高亮
                if (marker.allHighlightElements && marker.allHighlightElements.length > 0) {
                    console.log('兼容模式：发现多个需要高亮的元素，数量:', marker.allHighlightElements.length);
                    const highlightSuccess = applyHighlightToMultipleElements(marker.allHighlightElements, 'marker.allHighlightElements');
                    if (highlightSuccess) {
                        return true;
                    }
                }
                
                // 如果marker有wrappedElements，也尝试高亮
                if (marker.wrappedElements && marker.wrappedElements.length > 0) {
                    console.log('兼容模式：尝试高亮marker.wrappedElements');
                    const highlightSuccess = applyHighlightToMultipleElements(marker.wrappedElements, 'marker.wrappedElements');
                    if (highlightSuccess) {
                        return true;
                    }
                }
                
                // 获取高亮目标元素
                const target = getHighlightTarget(marker);
                console.log('获取到的高亮目标元素(兼容模式):', target);
                if (target && target instanceof HTMLElement) {
                    // 确保target在文档中
                    if (!document.body.contains(target)) {
                        console.warn('目标元素不在文档中（兼容模式），尝试使用后备方案');
                        
                        // 首先尝试使用marker中的多个元素
                        if ((marker.allHighlightElements && marker.allHighlightElements.length > 0) ||
                            (marker.wrappedElements && marker.wrappedElements.length > 0)) {
                            const elementsToTry = [...(marker.allHighlightElements || []), ...(marker.wrappedElements || [])];
                            console.log('目标元素不在文档中，尝试使用marker中的多个元素作为后备');
                            const highlightSuccess = applyHighlightToMultipleElements(elementsToTry, 'missingTarget.markerElements');
                            if (highlightSuccess) {
                                return true;
                            }
                        }
                        
                        // 如果speechQueue存在且有fallbackElement，优先使用
                        if (window.speechQueue && window.speechQueue.length > 0 && 
                            window.speechQueue[index] && 
                            window.speechQueue[index].fallbackElement && 
                            document.body.contains(window.speechQueue[index].fallbackElement)) {
                            
                            console.log('在兼容模式下使用speechQueue中的fallbackElement');
                            applyHighlightStyle(window.speechQueue[index].fallbackElement, 'speechQueue.fallbackElement');
                            return true;
                        }
                        
                        // 尝试使用标记元素作为后备
                        if (marker && document.body.contains(marker)) {
                            console.log('使用标记元素作为后备高亮元素');
                            applyHighlightStyle(marker, 'marker');
                            return true;
                        }
                        
                        // 尝试从speechQueue中获取有效元素（如果存在）
                        if (window.speechQueue && window.speechQueue.length > 0 && window.speechQueue[index]) {
                            const queueItem = window.speechQueue[index];
                            
                            // 先尝试使用queueItem中的多个元素
                            if (queueItem.wrappedElements && queueItem.wrappedElements.length > 0) {
                                console.log('兼容模式：尝试使用queueItem.wrappedElements');
                                const highlightSuccess = applyHighlightToMultipleElements(queueItem.wrappedElements, 'queueItem.wrappedElements');
                                if (highlightSuccess) {
                                    return true;
                                }
                            }
                            
                            // 尝试使用queueItem中的其他元素引用
                            const elementReferences = [
                                { el: queueItem.element, name: 'queueItem.element' },
                                { el: queueItem.originalElement, name: 'queueItem.originalElement' }
                            ];
                            
                            for (const ref of elementReferences) {
                                if (ref.el && document.body.contains(ref.el)) {
                                    console.log(`在兼容模式下使用${ref.name}作为后备`);
                                    applyHighlightStyle(ref.el, ref.name);
                                    return true;
                                }
                            }
                            
                            // 尝试查找父元素
                            const allRefs = elementReferences.map(r => r.el).filter(el => el);
                            for (const refEl of allRefs) {
                                let current = refEl;
                                while (current.parentNode && !document.body.contains(current)) {
                                    current = current.parentNode;
                                }
                                if (document.body.contains(current)) {
                                    console.log('在兼容模式下找到父元素作为后备:', current.tagName);
                                    applyHighlightStyle(current, 'parentElement');
                                    return true;
                                }
                            }
                        }
                        
                        // 最终极的后备方案：尝试查找当前文档中的任何可见文本元素
                        console.log('兼容模式：尝试终极后备方案');
                        
                        // 1. 尝试直接使用markdown-section作为最后的后备
                        const markdownSection = document.querySelector('.markdown-section');
                        if (markdownSection && document.body.contains(markdownSection)) {
                            console.log('兼容模式：使用markdown-section作为终极后备高亮元素');
                            applyHighlightStyle(markdownSection, 'markdownSection');
                            return true;
                        }
                        
                        // 2. 尝试从可见区域查找任何文本元素
                        const visibleTextElements = Array.from(document.querySelectorAll('p, span, div, h1, h2, h3, h4, h5, h6, li')).filter(el => {
                            return el.textContent.trim().length > 0 && 
                                   document.body.contains(el) && 
                                   isElementInViewport(el);
                        });
                        
                        if (visibleTextElements.length > 0) {
                            console.log('兼容模式：找到可见文本元素作为终极后备');
                            applyHighlightStyle(visibleTextElements[0], 'visibleTextElement');
                            return true;
                        }
                        
                        // 3. 尝试使用body作为最后的后备
                        if (document.body) {
                            console.log('兼容模式：使用body作为最后的后备高亮元素');
                            applyHighlightStyle(document.body, 'documentBody');
                            return true;
                        }
                        
                        console.error('兼容模式下所有后备方案均失败，无法找到有效的高亮元素');
                        return false;
                    }

                    // 检查元素是否在markdown-section中
                    const isInMarkdownSection = target.closest('.markdown-section') !== null;

                    // 根据元素类型和位置调整高亮样式参数
                    const fontSize = isInMarkdownSection ? '1em' : '1.1em';
                    const bgColor = isInMarkdownSection ? 'rgba(255, 255, 0, 0.3)' : 'rgba(255, 255, 0, 0.2)';

                    // 清除目标元素上可能存在的任何冲突样式
                    const conflictingStyles = ['font-size', 'color', 'font-weight', 'background-color',
                        'transition', 'text-decoration'];
                    conflictingStyles.forEach(style => {
                        target.style.removeProperty(style);
                    });

                    // 应用文字级别高亮样式
                    target.style.setProperty('font-size', fontSize, 'important');
                    target.style.setProperty('color', '#ff0000', 'important');
                    target.style.setProperty('font-weight', 'bold', 'important');
                    target.style.setProperty('background-color', bgColor, 'important');
                    target.style.setProperty('transition', 'all 0.1s ease', 'important');
                    target.style.setProperty('text-decoration', 'none', 'important');

                    // 添加CSS类作为额外保障
                    target.classList.add('speech-highlighting-active');

                    // 记录高亮的元素
                    window.highlightedElements.push(target);

                    // 自动滚动到高亮元素
                    scrollToElement(target);
                    
                    // 同时高亮可能存在的其他相关元素
                    if (marker.allHighlightElements && marker.allHighlightElements.length > 0) {
                        console.log('兼容模式：同时高亮其他相关元素');
                        applyHighlightToMultipleElements(marker.allHighlightElements.filter(el => el !== target), 'additionalMarkerElements');
                    }
                    
                    // 也检查marker.wrappedElements
                    if (marker.wrappedElements && marker.wrappedElements.length > 0) {
                        console.log('兼容模式：同时高亮wrappedElements中的其他元素');
                        applyHighlightToMultipleElements(marker.wrappedElements.filter(el => el !== target), 'additionalWrappedElements');
                    }
                    
                    return true;
                }
            }
        } catch (error) {
            console.error('高亮当前元素时出错:', error);
        }

        return true;
    }

    // 检查元素是否在视口中
    function isElementInViewport(el) {
        const rect = el.getBoundingClientRect();
        return (
            rect.top >= -rect.height &&
            rect.left >= -rect.width &&
            rect.bottom <= (window.innerHeight || document.documentElement.clientHeight) + rect.height &&
            rect.right <= (window.innerWidth || document.documentElement.clientWidth) + rect.width
        );
    }

    // 为元素添加朗读标记，用于追踪
    function markElementsForSpeech() {
        const markdownSection = document.querySelector('.markdown-section');
        if (!markdownSection) return [];

        // 重置句子元素数组
        window.sentenceElements = [];

        // 获取重要元素
        const importantElements = markdownSection.querySelectorAll('h1, h2, h3, h4, h5, h6, p, li, pre, strong');

        importantElements.forEach((element, elementIndex) => {
            // 为标题元素添加前缀
            let prefix = '';
            if (element.tagName.match(/H[1-6]/)) {
                const level = parseInt(element.tagName[1]);
                if (level === 1) prefix = '标题：';
                else if (level === 2) prefix = '小节：';
                else prefix = '要点：';
            }

            // 处理代码块
            if (element.tagName.toLowerCase() === 'pre') {
                // 为代码块添加提示
                const codeElement = element.querySelector('code');
                if (codeElement) {
                    // 创建标记
                    const marker = document.createElement('span');
                    marker.className = 'speech-marker';
                    marker.dataset.content = prefix + '【重要代码块开始】' + codeElement.textContent + '【重要代码块结束】';
                    // marker.style.display = 'none'; // 隐藏标记
                    element.appendChild(marker);
                    // 关键修复：设置wrappedElement属性指向code元素，这样可以高亮显示代码内容
                    marker.wrappedElement = codeElement;
                    window.sentenceElements.push(marker);
                }
            } else {
                // 对于其他元素，先检查是否包含子元素（除了文本节点）
                const hasChildElements = Array.from(element.childNodes).some(node => 
                    node.nodeType === Node.ELEMENT_NODE && 
                    node.tagName.toLowerCase() !== 'br' && 
                    node.tagName.toLowerCase() !== 'hr'
                );
                
                const textContent = element.textContent.trim();
                if (textContent) {
                    // 如果包含子元素或只有一个句子，直接标记整个元素
                    if (hasChildElements || textContent.length < 50) {
                        // 包含HTML标签或文本较短时，整个元素作为一个句子处理
                        const marker = document.createElement('span');
                        marker.className = 'speech-marker';
                        marker.dataset.content = prefix + textContent;
                        // marker.style.display = 'none'; // 隐藏标记
                        element.appendChild(marker);
                        // 设置wrappedElement属性指向要高亮的元素
                        marker.wrappedElement = element;
                        window.sentenceElements.push(marker);
                    } else {
                        // 文本较长且没有复杂子元素时，按句子分割
                        const sentences = textContent.split(/([。！？；：])/).filter(s => s.trim());

                        if (sentences.length === 1) {
                            // 单个句子，直接标记整个元素
                            const marker = document.createElement('span');
                            marker.className = 'speech-marker';
                            marker.dataset.content = prefix + sentences[0];
                            // marker.style.display = 'none'; // 隐藏标记
                            element.appendChild(marker);
                            marker.wrappedElement = element;
                            window.sentenceElements.push(marker);
                        } else {
                            // 多个句子，尝试精确标记
                            let lastIndex = 0;
                            let currentContent = textContent;
                            let successfullyWrapped = false;

                            try {
                                // 改进句子拆分逻辑，确保处理所有句子
                                for (let i = 0; i < sentences.length; i += 2) { // 每两个元素组成一个句子（内容+标点）
                                    const sentence = sentences[i] + (sentences[i + 1] || '');
                                    const sentenceWithPrefix = (i === 0 ? prefix : '') + sentence;

                                    // 查找句子在原始文本中的位置 - 更健壮的查找方式
                                    const startIndex = currentContent.indexOf(sentence);
                                    if (startIndex !== -1) {
                                        // 创建标记元素
                                        const marker = document.createElement('span');
                                        marker.className = 'speech-marker';
                                        marker.dataset.content = sentenceWithPrefix;
                                        // 初始化wrappedElements数组，确保始终存在
                                        marker.wrappedElements = [];
                                        
                                        // 尝试找到原始元素中对应的文本节点进行包装
                                        wrapTextInElement(element, startIndex + lastIndex, startIndex + lastIndex + sentence.length, marker);

                                        // 确保即使只包装了一部分也被视为成功
                                        if (marker.wrappedElements && marker.wrappedElements.length > 0) {
                                            successfullyWrapped = true;
                                        }

                                        window.sentenceElements.push(marker);

                                        lastIndex += startIndex + sentence.length;
                                        currentContent = currentContent.substring(startIndex + sentence.length);
                                    }
                                }
                            } catch (error) {
                                console.warn('精确分割句子时出错，回退到整体标记:', error);
                                successfullyWrapped = false;
                            }

                            // 如果精确分割失败，回退到整个元素标记
                            if (!successfullyWrapped && window.sentenceElements.length === 0) {
                                const marker = document.createElement('span');
                                marker.className = 'speech-marker';
                                marker.dataset.content = prefix + textContent;
                                element.appendChild(marker);
                                marker.wrappedElement = element;
                                window.sentenceElements.push(marker);
                            }
                        }
                    }
                }
            }

        });

        // 同时处理内联code元素
        const inlineCodeElements = markdownSection.querySelectorAll('code:not(pre code)');
        inlineCodeElements.forEach(element => {
            const parent = element.parentElement;
            // 确保父元素不是pre
            if (parent.tagName.toLowerCase() !== 'pre') {
                // 为内联code添加提示
                const marker = document.createElement('span');
                marker.className = 'speech-marker';
                marker.dataset.content = '【重要代码：' + element.textContent + '】';
                // marker.style.display = 'none'; // 隐藏标记

                // 包装内联code元素
                wrapElementWithMarker(element, marker);

                window.sentenceElements.push(marker);
            }
        });

        return window.sentenceElements;
    }

    // 在元素中包装特定文本范围
    function wrapTextInElement(element, start, end, marker) {
        function traverseTextNodes(node, rangeStart, rangeEnd, callback) {
                try {
                    if (!node) return 0;
                    
                    if (node.nodeType === Node.TEXT_NODE) {
                        const nodeLength = node.nodeValue ? node.nodeValue.length : 0;

                        // 改进范围检查逻辑，使其更健壮
                        if (rangeEnd <= 0 || rangeStart >= nodeLength) {
                            return nodeLength;
                        }

                        const startIndex = Math.max(0, rangeStart);
                        const endIndex = Math.min(nodeLength, rangeEnd);

                        if (startIndex < endIndex) {
                            callback(node, startIndex, endIndex);
                        }

                        return nodeLength;
                    } else if (node.nodeType === Node.ELEMENT_NODE) {
                        let accumulatedLength = 0;
                        const childNodes = Array.from(node.childNodes);

                        for (let i = 0; i < childNodes.length; i++) {
                            const nodeLength = traverseTextNodes(childNodes[i],
                                rangeStart - accumulatedLength,
                                rangeEnd - accumulatedLength,
                                callback);
                            accumulatedLength += nodeLength;
                            
                            // 优化：如果已经处理完所需范围，可以提前退出
                            if (accumulatedLength > rangeEnd && rangeEnd >= 0) {
                                break;
                            }
                        }

                        return accumulatedLength;
                    }
                } catch (error) {
                    console.warn('遍历文本节点时出错:', error);
                }
            
                return 0;
            }

        // 为每个文本节点段创建独立的wrapper
            let firstWrapper = null;
            
            // 初始化wrappedElements数组，确保始终存在
            if (!marker.wrappedElements) {
                marker.wrappedElements = [];
            }

            traverseTextNodes(element, start, end, (node, startIndex, endIndex) => {
                try {
                    const parent = node.parentNode;
                    
                    // 安全检查
                    if (!parent) return;

                    // 拆分文本节点
                    if (startIndex > 0) {
                        parent.insertBefore(document.createTextNode(node.nodeValue.substring(0, startIndex)), node);
                    }

                    // 为当前文本段创建新的wrapper
                    const wrapper = document.createElement('span');
                    wrapper.className = 'speech-highlight-target';
                    wrapper.textContent = node.nodeValue.substring(startIndex, endIndex);
                    parent.insertBefore(wrapper, node);

                    // 将所有wrapper都关联到marker
                    marker.wrappedElements.push(wrapper);
                    
                    // 保持向后兼容，仍然设置第一个wrapper为wrappedElement
                    if (!firstWrapper) {
                        firstWrapper = wrapper;
                        marker.wrappedElement = wrapper;
                    }

                    // 处理剩余文本
                    if (endIndex < node.nodeValue.length) {
                        parent.insertBefore(document.createTextNode(node.nodeValue.substring(endIndex)), node);
                    }

                    // 移除原始节点
                    parent.removeChild(node);
                } catch (error) {
                    console.warn('包装文本节点时出错:', error);
                }
            });

            // 确保至少有一个wrapper被设置
            if (!marker.wrappedElement && firstWrapper) {
                marker.wrappedElement = firstWrapper;
            }
    }

    // 用marker包装元素
    function wrapElementWithMarker(element, marker) {
        const parent = element.parentNode;
        if (!parent) return;

        // 创建一个包装器，确保code元素仍然可见
        const wrapper = document.createElement('span');
        wrapper.className = 'speech-highlight-target';

        // 先将marker插入到element之前
        parent.insertBefore(marker, element);

        // 将wrapper插入到element之前
        parent.insertBefore(wrapper, element);

        // 将element移动到wrapper中
        wrapper.appendChild(element);

        // 更新引用到wrapper
        marker.wrappedElement = wrapper;
    }

    // 获取高亮目标元素
    function getHighlightTarget(marker) {
        try {
            // 确保marker是有效的DOM元素
            if (!marker || !(marker instanceof Node)) {
                console.warn('无效的标记元素');
                return null;
            }

            // 处理多个包装元素的情况
            if (marker.wrappedElements && marker.wrappedElements.length > 0) {
                // 优先返回第一个包装元素（与原逻辑保持一致）
                if (marker.wrappedElements[0] && marker.wrappedElements[0] instanceof HTMLElement) {
                    // 存储所有包装元素，供highlightCurrentElement函数使用
                    marker.allHighlightElements = marker.wrappedElements;
                    return marker.wrappedElements[0];
                }
            }

            // 优先使用wrappedElement属性（如果存在）
            if (marker.wrappedElement && marker.wrappedElement instanceof HTMLElement) {
                return marker.wrappedElement;
            }

            // 如果是文本节点，尝试使用其父元素
            if (marker.nodeType === Node.TEXT_NODE && marker.parentNode instanceof HTMLElement) {
                // 检查是否在markdown-section中
                const markdownSection = marker.parentNode.closest('.markdown-section');
                if (markdownSection) {
                    // 在markdown-section中，返回文本节点的直接父元素
                    return marker.parentNode;
                }
            }

            // 如果marker本身是HTMLElement，直接返回
            if (marker instanceof HTMLElement) {
                // 对于markdown-section中的特殊元素，确保正确高亮
                const isInMarkdownSection = marker.closest('.markdown-section') !== null;

                // 对于代码块、引用块等特殊元素，确保返回最合适的高亮目标
                if (isInMarkdownSection) {
                    // 检查是否是嵌套在特殊元素中的文本
                    const specialParent = marker.closest('pre, blockquote, table');
                    if (specialParent && specialParent !== marker) {
                        // 如果在特殊元素内，但不是直接子元素，返回marker
                        return marker;
                    }
                }
                return marker;
            }

            // 默认返回marker
            return marker;
        } catch (error) {
            console.error('获取高亮目标元素出错:', error);
            return marker;
        }
    }

    // 获取页面内容用于朗读
    function getPageContent() {
        // 为元素添加朗读标记
        markElementsForSpeech();

        // 重置句子索引
        window.currentSentenceIndex = 0;

        // 从标记中提取文本内容
        let text = '';
        window.sentenceElements.forEach((marker, index) => {
            if (marker.dataset.content) {
                let content = marker.dataset.content;

                // 过滤表情符号
                content = filterEmojis(content);

                // 添加适当的停顿标记
                if (content.includes('【重要代码块')) {
                    text += '[停顿=500]' + content + '[停顿=500]。\n';
                } else if (content.includes('【重要代码：')) {
                    text += '[强调]' + content + '[/强调][停顿=300]。\n';
                } else if (content.startsWith('标题：')) {
                    text += '[停顿=500]' + content + '[停顿=400]。\n';
                } else if (content.startsWith('小节：')) {
                    text += '[停顿=400]' + content + '[停顿=300]。\n';
                } else if (content.startsWith('要点：')) {
                    text += '[停顿=300]' + content + '[停顿=300]。\n';
                } else {
                    // 在句号、问号、感叹号后添加停顿标记
                    let processedContent = content.replace(/([。！？])(?=[^\n])/g, '$1[停顿=300]');
                    // 在分号和冒号后添加较短的停顿标记
                    processedContent = processedContent.replace(/([；：])(?=[^\n])/g, '$1[停顿=200]');
                    text += processedContent + '[停顿=300]。\n';
                }
            }
        });

        // 如果没有内容，尝试获取原始文本
        if (!text.trim()) {
            const markdownSection = document.querySelector('.markdown-section');
            if (markdownSection) {
                text = filterEmojis(markdownSection.textContent.trim());
            }
        }

        return text;

        // 如果重要元素为空，尝试获取所有文本
        if (!text.trim()) {
            text = temp.textContent.trim();
        }

        return text;
    }

    // 过滤表情符号
    function filterEmojis(text) {
        // 表情符号正则表达式，覆盖常见的emoji和一些特殊符号
        const emojiRegex = /[\u{1F600}-\u{1F6FF}\u{1F300}-\u{1F5FF}\u{1F900}-\u{1F9FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}\u{1F1E6}-\u{1F1FF}\u{1F191}-\u{1F251}\u{1F44D}-\u{1F44E}\u{1F44F}-\u{1F450}\u{1F466}-\u{1F470}\u{1F471}-\u{1F480}\u{1F481}-\u{1F490}\u{1F491}-\u{1F4A0}\u{1F4A1}-\u{1F4B0}\u{1F4B1}-\u{1F4C0}\u{1F4C1}-\u{1F4D0}\u{1F4D1}-\u{1F4E0}\u{1F4E1}-\u{1F4F0}\u{1F4F1}-\u{1F4FF}\u{1F500}-\u{1F53F}\u{1F540}-\u{1F567}\u{1F56F}\u{1F570}-\u{1F573}\u{1F574}-\u{1F587}\u{1F58A}-\u{1F58D}\u{1F590}\u{1F591}\u{1F592}\u{1F593}\u{1F595}\u{1F596}\u{1F597}\u{1F598}\u{1F599}\u{1F5A5}\u{1F5A6}\u{1F5A7}\u{1F5A8}\u{1F5A9}\u{1F5B0}\u{1F5B1}\u{1F5B2}\u{1F5B3}\u{1F5B4}\u{1F5B5}\u{1F5B6}\u{1F5B7}\u{1F5B8}\u{1F5B9}\u{1F5BA}\u{1F5BB}\u{1F5BC}\u{1F5BD}\u{1F5BE}\u{1F5BF}\u{1F5C0}\u{1F5C1}\u{1F5C2}\u{1F5C3}\u{1F5C4}\u{1F5C5}\u{1F5C6}\u{1F5C7}\u{1F5C8}\u{1F5C9}\u{1F5CA}\u{1F5CB}\u{1F5CC}\u{1F5CD}\u{1F5CE}\u{1F5CF}\u{1F5D0}\u{1F5D1}\u{1F5D2}\u{1F5D3}\u{1F5D4}\u{1F5D5}\u{1F5D6}\u{1F5D7}\u{1F5D8}\u{1F5D9}\u{1F5DA}\u{1F5DB}\u{1F5DC}\u{1F5DD}\u{1F5DE}\u{1F5DF}\u{1F5E0}\u{1F5E1}\u{1F5E2}\u{1F5E3}\u{1F5E4}\u{1F5E5}\u{1F5E6}\u{1F5E7}\u{1F5E8}\u{1F5E9}\u{1F5EA}\u{1F5EB}\u{1F5EC}\u{1F5ED}\u{1F5EE}\u{1F5EF}\u{1F5F0}\u{1F5F1}\u{1F5F2}\u{1F5F3}\u{1F5F4}\u{1F5F5}\u{1F5F6}\u{1F5F7}\u{1F5F8}\u{1F5F9}\u{1F5FA}\u{1F5FB}\u{1F5FC}\u{1F5FD}\u{1F5FE}\u{1F5FF}\u{200D}\u{FE0F}]/gu;
        var target = text.replace(emojiRegex, '');
        return target;
    }

    // 全局变量用于分段朗读
    window.speechQueue = [];          // 朗读队列
    window.currentSegmentIndex = 0;   // 当前段落索引
    window.isPaused = false;          // 是否暂停
    window.isStopped = false;         // 是否停止
    window.currentVoice = null;       // 当前使用的语音引擎
    // 添加测试函数，方便手动测试高亮功能
    window.testHighlight = function (index) {
        console.log('测试高亮功能，索引:', index);
        // 确保先初始化元素
        if (!window.sentenceElements || window.sentenceElements.length === 0) {
            console.log('尝试初始化sentenceElements...');
            markElementsForSpeech();
        }

        if (window.sentenceElements && window.sentenceElements.length > 0) {
            // 如果没有指定索引，默认高亮第一个元素
            const testIndex = (typeof index === 'number' && index >= 0 && index < window.sentenceElements.length) ? index : 0;
            console.log('高亮索引:', testIndex, '内容:', window.sentenceElements[testIndex]?.dataset?.content || '未知内容');
            // 调用highlightCurrentElement函数进行测试
            highlightCurrentElement(testIndex);
            return true;
        } else {
            console.error('未找到可高亮的元素，请先调用startSpeech或刷新页面');
            return false;
        }
    };

    // 添加一个可见的测试按钮到页面
    function addTestButton() {
        // 检查按钮是否已存在
        if (document.getElementById('speech-test-button')) return;

        const button = document.createElement('button');
        button.id = 'speech-test-button';
        button.textContent = '测试高亮功能';
        button.style.position = 'fixed';
        button.style.bottom = '20px';
        button.style.right = '20px';
        button.style.zIndex = '9999';
        button.style.padding = '10px 20px';
        button.style.backgroundColor = '#4CAF50';
        button.style.color = 'white';
        button.style.border = 'none';
        button.style.borderRadius = '5px';
        button.style.cursor = 'pointer';
        button.style.fontSize = '16px';

        button.onclick = function () {
            // 确保先初始化标记元素
            if (!window.sentenceElements || window.sentenceElements.length === 0) {
                markElementsForSpeech();
            }

            // 高亮第一个元素
            if (window.sentenceElements && window.sentenceElements.length > 0) {
                highlightCurrentElement(0);
                alert('高亮测试完成，请查看第一个段落是否已高亮');
            } else {
                alert('未找到可高亮的元素，请刷新页面后重试');
            }
        };

        document.body.appendChild(button);
    }

    // 在页面加载完成后添加测试按钮
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', addTestButton);
    } else {
        addTestButton();
    }

    // 将文本直接拆分为句子数组，每个句子作为一个朗读单元
    function splitTextIntoSegments(text) {
        const sentences = [];
        
        // 增强版句子分隔符正则表达式，包含更多中英文标点场景
        // 支持句号、感叹号、问号、分号、冒号等标点作为句子结束
        const sentenceEndings = /([。！？.!?；;：:])\s*/g;
        
        let match;
        let lastIndex = 0;
        let currentSentence = '';
        
        // 精确提取所有句子
        while ((match = sentenceEndings.exec(text)) !== null) {
            // 提取当前句子（包括结束标点）
            currentSentence = text.substring(lastIndex, match.index) + match[0];
            // 确保句子不为空且去除多余空白
            const trimmedSentence = currentSentence.trim();
            if (trimmedSentence) {
                // 过滤掉纯标点符号的句子
                if (!/^[。！？.!?；;：:]+$/.test(trimmedSentence)) {
                    sentences.push(trimmedSentence);
                }
            }
            lastIndex = match.index + match[0].length;
        }
        
        // 处理最后一段文本（如果没有结束标点）
        if (lastIndex < text.length) {
            currentSentence = text.substring(lastIndex).trim();
            if (currentSentence && !/^[。！？.!?；;：:]+$/.test(currentSentence)) {
                sentences.push(currentSentence);
            }
        }
        
        // 保存句子信息
        window.allSentences = sentences;
        
        console.log('文本拆分为', sentences.length, '个句子，每个句子作为独立的朗读单元');
        
        // 直接返回句子数组，每个句子作为一个朗读单元
        return sentences;
    }

    // 朗读队列中的下一个句子
    function speakNextSegment() {
        // 如果已停止或队列为空，重置状态
        if (window.isStopped || window.speechQueue.length <= window.currentSegmentIndex) {
            resetSpeechControls();
            window.speechQueue = [];
            window.currentSegmentIndex = 0;
            window.isStopped = false;
            window.isPaused = false;
            return;
        }

        // 取消当前所有朗读
        speechSynthesis.cancel();

        // 获取下一个朗读项（包含文本和DOM元素信息）
        const speechItem = window.speechQueue[window.currentSegmentIndex];
        const text = speechItem.text;
        console.log(`开始朗读句子 ${window.currentSegmentIndex}:`, text);
        
        // 清除高亮更新定时器，避免冲突
        if (window.highlightUpdateTimer) {
            clearTimeout(window.highlightUpdateTimer);
            window.highlightUpdateTimer = null;
        }
        
        // 使用highlightCurrentElement函数进行高亮
        // 现在highlightCurrentElement函数会自动使用currentSegmentIndex获取当前朗读项
        console.log(`高亮当前句子索引: ${window.currentSegmentIndex}，使用speechQueue中的DOM元素信息`);
        highlightCurrentElement(window.currentSegmentIndex);

        // 创建新的语音实例
        const utterance = new SpeechSynthesisUtterance(text);

        // 处理文本中的朗读提示标记
        let processedText = text;

        // 处理强调标记（通过调整语速来实现重读效果）
        let emphasisParts = [];
        let currentText = processedText;

        // 提取带有强调标记的部分
        const emphasisRegex = /\[强调\](.*?)\[\/强调\]/g;
        let match;
        let lastIndex = 0;

        while ((match = emphasisRegex.exec(processedText)) !== null) {
            // 添加强调标记前的文本（正常语速）
            if (match.index > lastIndex) {
                emphasisParts.push({
                    text: processedText.substring(lastIndex, match.index),
                    isEmphasis: false
                });
            }

            // 添加强调部分（较慢语速以表示重读）
            emphasisParts.push({
                text: match[1],
                isEmphasis: true
            });

            lastIndex = match.index + match[0].length;
        }

        // 添加剩余的文本
        if (lastIndex < processedText.length) {
            emphasisParts.push({
                text: processedText.substring(lastIndex),
                isEmphasis: false
            });
        }

        // 处理停顿标记
        for (let i = 0; i < emphasisParts.length; i++) {
            let part = emphasisParts[i];
            // 替换停顿标记为实际的停顿（通过在文本中插入适当的停顿提示）
            part.text = part.text.replace(/\[停顿=(\d+)\]/g, '。'); // 用句号替代停顿标记，让语音引擎自然停顿
        }

        // 使用全局保存的语音和参数，确保整个朗读过程中保持一致
        if (window.currentVoice) {
            utterance.voice = window.currentVoice;
            utterance.lang = window.currentVoice.lang;
        } else {
            // 如果没有保存的语音，使用默认设置
            utterance.lang = 'zh-CN';
        }

        // 基本语速设置
        utterance.rate = window.currentRate;
        utterance.pitch = window.currentPitch;

        // 如果只有一个部分，直接设置文本
        if (emphasisParts.length === 1) {
            utterance.text = emphasisParts[0].text;
            // 如果是强调部分，调整语速
            if (emphasisParts[0].isEmphasis) {
                utterance.rate = window.emphasisRate;
            }
        } else {
            // 如果有多个部分，先处理第一个部分
            utterance.text = emphasisParts[0].text;
            if (emphasisParts[0].isEmphasis) {
                utterance.rate = window.emphasisRate;
            }

            // 记录当前处理的部分索引
            window.currentEmphasisIndex = 0;
            window.emphasisParts = emphasisParts;
        }

        // 设置错误处理
        utterance.onerror = function(event) {
            console.error('语音朗读出错:', event);
            // 清除当前高亮
            clearHighlights();
            // 移到下一个句子
            window.currentSegmentIndex++;
            // 继续朗读下一个句子
            setTimeout(speakNextSegment, 300);
        };

        // 设置朗读结束处理
        utterance.onend = function() {
            // 检查是否有多个强调部分需要处理
            if (window.emphasisParts && window.emphasisParts.length > window.currentEmphasisIndex + 1) {
                // 继续处理下一个强调部分
                window.currentEmphasisIndex++;
                const nextPart = window.emphasisParts[window.currentEmphasisIndex];
                
                console.log(`处理句子 ${window.currentSegmentIndex} 的强调部分 ${window.currentEmphasisIndex}`);
                
                // 创建新的语音实例处理下一部分
                const nextUtterance = new SpeechSynthesisUtterance(nextPart.text);
                
                // 复制当前语音设置
                if (window.currentVoice) {
                    nextUtterance.voice = window.currentVoice;
                    nextUtterance.lang = window.currentVoice.lang;
                }
                nextUtterance.rate = nextPart.isEmphasis ? window.emphasisRate : window.currentRate;
                nextUtterance.pitch = window.currentPitch;
                
                // 设置相同的事件处理
                nextUtterance.onerror = utterance.onerror;
                nextUtterance.onend = utterance.onend;
                nextUtterance.onboundary = utterance.onboundary;
                
                // 开始朗读下一部分
                speechSynthesis.speak(nextUtterance);
            } else {
                // 所有强调部分处理完毕，完整句子朗读完成
                console.log(`句子 ${window.currentSegmentIndex} 朗读完成`);
                
                // 重要：朗读完成后立即清除当前句子的高亮
                console.log(`清除句子 ${window.currentSegmentIndex} 的高亮`);
                clearHighlights();
                
                // 清除强调部分的引用
                window.emphasisParts = null;
                window.currentEmphasisIndex = 0;
                
                // 更新当前句子索引
                window.currentSegmentIndex++;
                
                // 检查是否还有下一个句子
                if (window.speechQueue.length > window.currentSegmentIndex) {
                    console.log(`准备朗读下一个句子，索引: ${window.currentSegmentIndex}`);
                    // 短暂延迟后朗读下一个句子，让用户有时间看到高亮的切换
                    setTimeout(speakNextSegment, 200);
                } else {
                    console.log('所有句子朗读完成');
                    // 重置状态
                    resetSpeechControls();
                    window.speechQueue = [];
                    window.currentSegmentIndex = 0;
                    window.isStopped = false;
                    window.isPaused = false;
                }
            }
        };

        // 设置边界事件，用于跟踪朗读进度
        utterance.onboundary = function(event) {
            // 可以在这里添加额外的进度跟踪逻辑
            console.log(`朗读进度: ${event.charIndex}/${utterance.text.length}`);
        };
        // 处理多部分强调文本的逻辑需要整合到我们的onend处理中
        // 已在上面的onend事件中处理了句子切换和高亮清除

        //             // 清除强调部分的引用
        //             window.emphasisParts = null;
        //             window.currentEmphasisIndex = 0;

        //             // 检查是否是代码块，添加更长的停顿
        //             const isCodeBlock = text.includes('【重要代码块');
        //             const pauseTime = isCodeBlock ? window.codePause : window.normalPause;

        //             // 添加适当的停顿后继续朗读下一段
        //             setTimeout(speakNextSegment, pauseTime);
        //         }
        //     }
        // };

        // 监听语音朗读的边界事件（已去除高亮逻辑）
        utterance.onboundary = (event) => {
            // 仅保留事件监听框架，移除所有高亮相关代码
            if (event.name === 'word' && event.charIndex >= 0 && event.charLength > 0) {
                // 边界事件仍保留，但不进行任何高亮操作
            }
        };

        // 确保段落结束时正确清除高亮并为下一段落做准备
        utterance.onend = () => {
            // 先清除当前段落的高亮
            clearHighlights();

            // 调用原始的onend处理逻辑
            if (!window.isStopped && !window.isPaused) {
                // 检查是否有多个强调部分需要处理
                if (window.emphasisParts && window.emphasisParts.length > window.currentEmphasisIndex + 1) {
                    // 继续处理下一个强调部分
                    window.currentEmphasisIndex++;
                    const nextPart = window.emphasisParts[window.currentEmphasisIndex];

                    // 创建新的语音实例处理下一部分
                    const nextUtterance = new SpeechSynthesisUtterance(nextPart.text);

                    // 复制当前语音设置
                    if (window.currentVoice) {
                        nextUtterance.voice = window.currentVoice;
                        nextUtterance.lang = window.currentVoice.lang;
                    }
                    nextUtterance.rate = nextPart.isEmphasis ? window.emphasisRate : window.currentRate;
                    nextUtterance.pitch = window.currentPitch;

                    // 设置相同的事件处理
                    nextUtterance.onerror = utterance.onerror;
                    nextUtterance.onend = utterance.onend;

                    // 开始朗读下一部分
                    speechSynthesis.speak(nextUtterance);
                } else {
                    // 所有强调部分处理完毕，继续下一句子
                    window.currentSegmentIndex++;

                    // 清除强调部分的引用
                    window.emphasisParts = null;
                    window.currentEmphasisIndex = 0;

                    // 检查是否是代码块，添加更长的停顿
                    const isCodeBlock = text.includes('【重要代码块');
                    const pauseTime = isCodeBlock ? window.codePause : window.normalPause;

                    // 添加适当的停顿后继续朗读下一段
                    setTimeout(speakNextSegment, pauseTime);
                }
            }
        };

        // 保存当前朗读实例
        window.currentUtterance = utterance;

        // 开始朗读
        speechSynthesis.speak(utterance);
    }

    // 开始朗读
    function startSpeech() {
        // 确保高亮CSS已添加
        addHighlightCSS();
        // 重置状态
        speechSynthesis.cancel();
        window.speechQueue = [];
        window.currentSegmentIndex = 0;
        window.isStopped = false;
        window.isPaused = false;
        window.currentSentenceIndex = 0;
        // 清除高亮更新定时器
        if (window.highlightUpdateTimer) {
            clearTimeout(window.highlightUpdateTimer);
            window.highlightUpdateTimer = null;
        }

        // 清除之前的高亮
        clearHighlights();

        // 设置默认语速为0.8
        const rateControl = document.getElementById('speech-rate');
        if (rateControl && !rateControl.value) {
            rateControl.value = '0.8';
        }

        // 在开始朗读时保存当前选择的语音和参数，确保整个朗读过程中使用相同设置
        const voiceSelect = document.getElementById('speech-voice');
        const voices = speechSynthesis.getVoices();
        window.currentVoice = voices.find(voice => voice.name === voiceSelect.value);
        window.currentRate = parseFloat(document.getElementById('speech-rate').value);
        window.currentPitch = parseFloat(document.getElementById('speech-pitch').value);

        // 标记元素并构建speechQueue，确保朗读内容与高亮元素完全匹配
        const elements = markElementsForSpeech();
        if (!elements || elements.length === 0) {
            alert('没有找到可朗读的内容');
            return;
        }

        // 构建speechQueue，每个项包含文本和对应的DOM元素
        // 确保每个朗读项的text、element和wrappedElement正确匹配
        window.speechQueue = elements.map((element, index) => {
            // 获取正确的高亮元素：优先使用wrappedElement，如果不存在则使用element自身
            const targetElement = element.wrappedElement || element;
            
            // 验证元素是否在文档中
            const elementInDoc = document.body.contains(element);
            const wrappedElementInDoc = targetElement && document.body.contains(targetElement);
            
            // 添加调试信息
            if (!elementInDoc) {
                console.warn(`构建speechQueue时发现element(${index})不在文档中，标签: ${element.tagName}`);
            }
            if (!wrappedElementInDoc && targetElement !== element) {
                console.warn(`构建speechQueue时发现wrappedElement(${index})不在文档中`);
            }
            
            // 确保总有有效的元素引用
            let finalElement = element;
            let finalWrappedElement = targetElement;
            
            // 如果wrappedElement不在文档中但element在，使用element作为wrappedElement
            if (!wrappedElementInDoc && elementInDoc) {
                finalWrappedElement = element;
                console.log(`为索引${index}重新设置wrappedElement为element`);
            }
            
            // 添加后备元素引用，用于极端情况
            let fallbackElement = null;
            // 尝试从element向上查找有效的父元素
            if (!elementInDoc) {
                let current = element;
                while (current.parentNode && !document.body.contains(current)) {
                    current = current.parentNode;
                }
                if (document.body.contains(current)) {
                    fallbackElement = current;
                    console.log(`为索引${index}找到后备元素: ${current.tagName}`);
                }
            }
            
            return {
                text: element.dataset.content,
                element: finalElement,
                wrappedElement: finalWrappedElement,
                fallbackElement: fallbackElement,
                originalElement: element,
                index: index
            };
        });
        
        // 移除无效的队列项
        window.speechQueue = window.speechQueue.filter(item => 
            (item.element) || 
            (item.fallbackElement)
        );

        console.log('构建完成speechQueue，共', window.speechQueue.length, '个朗读项');

        // 更新按钮状态
        updateSpeechControls(true);

        // 开始朗读第一句
        speakNextSegment();
    }

    // 更新语音控制按钮状态
    function updateSpeechControls(isSpeaking) {
        document.getElementById('speech-toggle').disabled = isSpeaking;
        document.getElementById('speech-pause').disabled = !isSpeaking;
        document.getElementById('speech-resume').disabled = !isSpeaking;
        document.getElementById('speech-stop').disabled = !isSpeaking;
    }

    // 重置语音控制按钮状态
    function resetSpeechControls() {
        document.getElementById('speech-toggle').disabled = false;
        document.getElementById('speech-pause').disabled = true;
        document.getElementById('speech-resume').disabled = true;
        document.getElementById('speech-stop').disabled = true;
        window.currentUtterance = null;
        // 重置状态变量
        window.speechQueue = [];
        window.currentSegmentIndex = 0;
        window.isPaused = false;
        window.isStopped = false;
        window.currentSentenceIndex = 0;
        // 清除高亮更新定时器
        if (window.highlightUpdateTimer) {
            clearTimeout(window.highlightUpdateTimer);
            window.highlightUpdateTimer = null;
        }
        // 清除高亮并确保样式完全恢复
        clearHighlights();
        // 清除强调部分的引用
        window.emphasisParts = null;
        window.currentEmphasisIndex = 0;
    }

    // 添加事件监听器
    function addEventListeners() {
        // 开始朗读按钮
        document.getElementById('speech-toggle').addEventListener('click', startSpeech);

        // 暂停按钮
        document.getElementById('speech-pause').addEventListener('click', () => {
            speechSynthesis.pause();
            window.isPaused = true;
            document.getElementById('speech-resume').disabled = false;
            document.getElementById('speech-pause').disabled = true;
        });

        // 继续按钮
        document.getElementById('speech-resume').addEventListener('click', () => {
            if (window.isPaused) {
                // 对于分段朗读，我们不使用resume，而是从当前段落继续
                window.isPaused = false;
                speakNextSegment();
            } else {
                speechSynthesis.resume();
            }
            document.getElementById('speech-resume').disabled = true;
            document.getElementById('speech-pause').disabled = false;
        });

        // 停止按钮
        document.getElementById('speech-stop').addEventListener('click', () => {
            speechSynthesis.cancel();
            window.isStopped = true;
            resetSpeechControls();
        });

        // 语音列表变化时更新
        speechSynthesis.onvoiceschanged = initVoices;
    }

    // 创建页面内的'阅读本文'按钮
    function createPageSpeechButton() {
        // 等待markdown内容加载完成，增加延迟时间以确保在移动设备上内容完全渲染
        setTimeout(() => {
            const markdownSection = document.querySelector('.markdown-section');
            if (!markdownSection) return;

            // 移除可能存在的旧按钮
            const existingButton = document.getElementById('read-this-page');
            if (existingButton) {
                existingButton.remove();
            }

            // 创建阅读按钮
            const readButton = document.createElement('button');
            readButton.id = 'read-this-page';
            readButton.className = 'read-this-page-btn';
            readButton.innerHTML = `
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"></polygon>
                    <path d="M15.54 8.46a5 5 0 0 1 0 7.07"></path>
                    <path d="M19.07 4.93a10 10 0 0 1 0 14.14"></path>
                </svg>
                阅读本文
            `;

            // 添加点击事件，确保读取当前页面内容
            readButton.addEventListener('click', startSpeech);

            // 添加到markdown内容区域的顶部
            markdownSection.insertBefore(readButton, markdownSection.firstChild);
        }, 1500); // 增加延迟到1500ms以确保在移动设备上内容完全渲染
    }

    // 监听docsify页面切换事件
    function listenForPageChanges() {
        // docsify使用的事件
        if (window.$docsify) {
            // 页面切换完成后重新创建按钮
            window.$docsify.plugins = [
                function (hook) {
                    // 内容渲染完成后触发
                    hook.afterEach(function () {
                        createPageSpeechButton();
                    });
                }
            ].concat(window.$docsify.plugins || []);
        }

        // 同时使用通用DOM变化监听作为后备
        const observer = new MutationObserver(function (mutations) {
            mutations.forEach(function (mutation) {
                if (mutation.type === 'childList') {
                    const markdownSection = document.querySelector('.markdown-section');
                    if (markdownSection && mutation.target === markdownSection) {
                        // 如果markdown内容发生变化，重新创建按钮
                        createPageSpeechButton();
                    }
                }
            });
        });

        // 开始观察markdown-section的变化
        const markdownSection = document.querySelector('.markdown-section');
        if (markdownSection) {
            observer.observe(markdownSection, {
                childList: true,
                subtree: true
            });
        }
    }

    // 初始化语音朗读功能
    function initSpeech() {
        // 创建控制界面
        createSpeechControls();

        // 创建页面内的阅读按钮
        createPageSpeechButton();

        // 初始化语音列表
        initVoices();

        // 添加事件监听器
        addEventListeners();

        // 监听页面切换事件
        listenForPageChanges();
    }

    // 页面加载完成后初始化
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initSpeech);
    } else {
        // 如果页面已经加载完成，直接初始化
        setTimeout(initSpeech, 1000); // 延迟一下确保markdown内容已渲染
    }

    // 添加CSS样式到页面
    function addSpeechStyles() {
        const style = document.createElement('style');
        style.textContent = `
            /* 语音高亮样式 */
            .speech-marker {
                display: none;
            }
            
            /* 高亮时的样式（通过JavaScript动态添加） */
            /* 字体放大1.5倍，红色，加粗 */
            .speech-controls {
                position: fixed;
                bottom: 20px;
                right: 20px;
                background: white;
                border-radius: 25px;
                padding: 10px;
                box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
                z-index: 1000;
                display: flex;
                align-items: center;
                gap: 5px;
                transition: all 0.3s ease;
            }
            
            .speech-controls:hover {
                box-shadow: 0 6px 20px rgba(0, 0, 0, 0.2);
            }
            
            .speech-btn {
                width: 36px;
                height: 36px;
                border-radius: 50%;
                border: none;
                background: var(--primary-color, #42b983);
                color: white;
                cursor: pointer;
                display: flex;
                align-items: center;
                justify-content: center;
                transition: all 0.3s ease;
                padding: 0;
            }
            
            .speech-btn:hover:not(:disabled) {
                background: var(--primary-dark, #3aa876);
                transform: translateY(-2px);
            }
            
            .speech-btn:disabled {
                background: #ccc;
                cursor: not-allowed;
                transform: none;
            }
            
            .speech-voice {
                padding: 5px 10px;
                border: 1px solid #ddd;
                border-radius: 15px;
                background: white;
                font-size: 12px;
                outline: none;
                transition: border-color 0.3s ease;
            }
            
            .speech-voice:focus {
                border-color: var(--primary-color, #42b983);
            }
            
            .speech-rate,
            .speech-pitch {
                width: 80px;
                height: 5px;
                border-radius: 3px;
                background: #ddd;
                outline: none;
                -webkit-appearance: none;
            }
            
            .speech-rate::-webkit-slider-thumb,
            .speech-pitch::-webkit-slider-thumb {
                -webkit-appearance: none;
                width: 15px;
                height: 15px;
                border-radius: 50%;
                background: var(--primary-color, #42b983);
                cursor: pointer;
                transition: all 0.3s ease;
            }
            
            .speech-rate::-webkit-slider-thumb:hover,
            .speech-pitch::-webkit-slider-thumb:hover {
                background: var(--primary-dark, #3aa876);
                transform: scale(1.2);
            }
            
            .speech-rate::-moz-range-thumb,
            .speech-pitch::-moz-range-thumb {
                width: 15px;
                height: 15px;
                border-radius: 50%;
                background: var(--primary-color, #42b983);
                cursor: pointer;
                border: none;
            }
            
            /* 页面内阅读按钮样式 */
            .read-this-page-btn {
                display: flex !important;
                align-items: center;
                gap: 8px;
                padding: 12px 24px;
                margin: 0 0 20px 0 !important;
                background: var(--primary-color, #42b983);
                color: white;
                border: none;
                border-radius: 8px;
                font-size: 16px;
                font-weight: 500;
                cursor: pointer;
                transition: all 0.3s ease;
                box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
                position: relative;
                z-index: 100;
                clear: both;
            }
            
            .read-this-page-btn:hover {
                background: var(--primary-dark, #3aa876);
                transform: translateY(-2px);
                box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
            }
            
            .read-this-page-btn:active {
                transform: translateY(0);
            }
            
            /* 响应式设计 */
            @media screen and (max-width: 768px) {
                .speech-controls {
                    bottom: 10px;
                    right: 10px;
                    flex-wrap: wrap;
                    max-width: 280px;
                }
                
                .speech-voice {
                    flex: 1 1 100%;
                    margin: 5px 0;
                }
                
                .speech-rate,
                .speech-pitch {
                    width: 60px;
                }
                
                .read-this-page-btn {
                    width: 100% !important;
                    justify-content: center;
                    padding: 14px 20px;
                    font-size: 15px;
                    margin: 0 0 20px 0 !important;
                    box-shadow: 0 3px 10px rgba(0, 0, 0, 0.2);
                    position: relative;
                    z-index: 100;
                    display: flex !important;
                    clear: both;
                }
            }
        `;
        document.head.appendChild(style);
    }

    // 添加样式
    addSpeechStyles();
})();
