/**
 * 게임 유틸리티 함수들
 * 공통으로 사용되는 헬퍼 함수들을 모아놓은 모듈
 */

// === 유틸리티 함수 모듈 ===

export function delay(ms) {
    if (typeof ms !== 'number' || ms < 0) throw new Error('delay: ms는 0 이상의 숫자여야 합니다.');
    return new Promise(resolve => setTimeout(resolve, ms));
}

export function randomInt(min, max) {
    if (typeof min !== 'number' || typeof max !== 'number' || min > max) throw new Error('randomInt: min/max 값이 올바르지 않습니다.');
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

export function randomChoice(array) {
    if (!Array.isArray(array) || array.length === 0) throw new Error('randomChoice: 배열이 비어있습니다.');
    return array[Math.floor(Math.random() * array.length)];
}

export function saveToLocalStorage(key, data) {
    try {
        localStorage.setItem(key, JSON.stringify(data));
    } catch (error) {
        // 저장 실패 시 조용히 무시
    }
}

export function loadFromLocalStorage(key, defaultValue = null) {
    try {
        const data = localStorage.getItem(key);
        return data ? JSON.parse(data) : defaultValue;
    } catch {
        return defaultValue;
    }
}

export function removeFromLocalStorage(key) {
    try {
        localStorage.removeItem(key);
    } catch {}
}

export function createElement(tag, attributes = {}, textContent = '') {
    const element = document.createElement(tag);
    Object.entries(attributes).forEach(([key, value]) => {
        if (key === 'className') element.className = value;
        else if (key === 'textContent') element.textContent = value;
        else element.setAttribute(key, value);
    });
    if (textContent) element.textContent = textContent;
    return element;
}

export function removeEventListener(element, eventType, handler) {
    if (element && handler) element.removeEventListener(eventType, handler);
}

export function clearTimer(timerId) {
    if (timerId) {
        clearTimeout(timerId);
        clearInterval(timerId);
    }
}

export function measurePerformance(label) {
    const start = performance.now();
    return () => {
        const end = performance.now();
        console.log(`${label}: ${(end - start).toFixed(2)}ms`);
    };
}

export function debounce(func, wait) {
    let timeout;
    return function(...args) {
        clearTimeout(timeout);
        timeout = setTimeout(() => func(...args), wait);
    };
}

export function throttle(func, limit) {
    let inThrottle;
    return function(...args) {
        if (!inThrottle) {
            func.apply(this, args);
            inThrottle = true;
            setTimeout(() => inThrottle = false, limit);
        }
    };
}

/**
 * Quest.json 파일을 로드하고 파싱하는 함수
 * @returns {Promise<Array>} 퀘스트 데이터 배열
 */
export async function loadQuestData() {
    try {
        const response = await fetch('Quest.json');
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        const questData = await response.json();
        console.log('✅ Quest.json 로드 성공:', questData.length, '개의 퀘스트');
        return questData;
    } catch (error) {
        console.error('❌ Quest.json 로드 실패:', error);
        // 기본 퀘스트 데이터 반환
        return getDefaultQuests();
    }
}

/**
 * 기본 퀘스트 데이터 (Quest.json 로드 실패 시 사용)
 * @returns {Array} 기본 퀘스트 배열
 */
export function getDefaultQuests() {
    return [
        {
            id: 1,
            name: "1+1=?",
            description: "1단계 아이템 3회 합성하기",
            exp: 10,
            gold: 200,
            jewel: 3
        },
        {
            id: 2,
            name: "자원이 더 필요해!",
            description: "자원생산 15회 모두 소진하기",
            exp: 10,
            gold: 40,
            jewel: 4
        },
        {
            id: 3,
            name: "알뜰살뜰한 생활",
            description: "아이템 1회 판매하기",
            exp: 15,
            gold: 60,
            jewel: 5
        }
    ];
}

/**
 * Quest.json 데이터를 게임 내 퀘스트 객체로 변환
 * @param {Array} questData - Quest.json에서 로드한 원본 데이터
 * @returns {Array} 게임 내 Quest 객체 배열
 */
export function convertQuestDataToGameQuests(questData) {
    return questData.map(quest => {
        // 퀘스트 타입에 따른 목표 설정
        const objectives = getQuestObjectives(quest);
        
        // 보상 설정
        const rewards = [
            { type: 'experience', amount: quest.exp }
        ];
        
        // 골드가 있는 경우에만 추가
        if (quest.gold && quest.gold > 0) {
            rewards.push({ type: 'coins', amount: quest.gold });
        }
        
        // 젬이 있는 경우에만 추가
        if (quest.jewel && quest.jewel > 0) {
            rewards.push({ type: 'gems', amount: quest.jewel });
        }
        
        // Quest 클래스는 main.js에서 정의되므로 여기서는 객체 형태로 반환
        return {
            id: `quest${quest.id}`,
            title: quest.name,
            description: quest.description,
            objectives: objectives,
            rewards: rewards,
            progress: {},
            completed: false,
            completedTime: null,
            originalData: quest // 원본 데이터 보존
        };
    });
}

/**
 * 퀘스트 설명에 따른 목표 타입 결정
 * @param {Object} quest - 퀘스트 데이터
 * @returns {Array} 목표 배열
 */
export function getQuestObjectives(quest) {
    const description = quest.description.toLowerCase();
    
    // 1단계 아이템 합성
    if (description.includes('1단계') && description.includes('합성')) {
        const amount = description.match(/(\d+)회/)?.[1] || 3;
        return [{ type: 'merge_level1', amount: parseInt(amount) }];
    } 
    // 자원생산 소진
    else if (description.includes('자원생산') && description.includes('소진')) {
        const amount = description.match(/(\d+)회/)?.[1] || 15;
        return [{ type: 'spawn_exhaust', amount: parseInt(amount) }];
    } 
    // 아이템 판매
    else if (description.includes('판매')) {
        const amount = description.match(/(\d+)회/)?.[1] || 1;
        return [{ type: 'sell', amount: parseInt(amount) }];
    } 
    // 나무 2레벨 생성
    else if (description.includes('나무') && description.includes('2레벨')) {
        const amount = description.match(/(\d+)개/)?.[1] || 3;
        return [{ type: 'create_wood_level2', amount: parseInt(amount) }];
    } 
    // 스테이지 1-1 클리어
    else if (description.includes('스테이지 1-1') && description.includes('클리어')) {
        return [{ type: 'stage_clear_1_1', amount: 1 }];
    } 
    // 상점에서 티켓 구매
    else if (description.includes('상점') && description.includes('티켓')) {
        return [{ type: 'buy_ticket', amount: 1 }];
    } 
    // 해변가 건설
    else if (description.includes('해변가') && description.includes('건설')) {
        return [{ type: 'building_beach', amount: 1 }];
    } 
    // 식물 3단계 제작
    else if (description.includes('식물') && description.includes('3단계')) {
        const amount = description.match(/(\d+)개/)?.[1] || 3;
        return [{ type: 'create_plant_level3', amount: parseInt(amount) }];
    } 
    // 벽돌 3단계 제작
    else if (description.includes('벽돌') && description.includes('3단계')) {
        const amount = description.match(/(\d+)개/)?.[1] || 3;
        return [{ type: 'create_brick_level3', amount: parseInt(amount) }];
    } 
    // 리조트 건물 복구
    else if (description.includes('리조트') && description.includes('복구')) {
        return [{ type: 'building_resort', amount: 1 }];
    } 
    // 자동 머지 아이템 구매
    else if (description.includes('자동 머지') && description.includes('구매')) {
        return [{ type: 'buy_auto_merge', amount: 1 }];
    } 
    // 4단계 3개 만들기
    else if (description.includes('4단계') && description.includes('3개')) {
        return [{ type: 'create_level4', amount: 3 }];
    } 
    // 모든 4단계 자원 모으기
    else if (description.includes('모든 4단계') && description.includes('모으기')) {
        return [{ type: 'collect_all_level4', amount: 1 }];
    } 
    // 수영장 건설
    else if (description.includes('수영장') && description.includes('건설')) {
        return [{ type: 'building_pool', amount: 1 }];
    } 
    // 챕터1 클리어
    else if (description.includes('챕터1') && description.includes('클리어')) {
        return [{ type: 'chapter_clear_1', amount: 1 }];
    }
    // 더 정확한 매칭을 위한 추가 패턴들
    else if (description.includes('레벨') && description.includes('생성')) {
        const levelMatch = description.match(/(\d+)레벨/)?.[1];
        const amountMatch = description.match(/(\d+)개/)?.[1];
        if (levelMatch && amountMatch) {
            return [{ type: `create_level${levelMatch}`, amount: parseInt(amountMatch) }];
        }
    }
    else if (description.includes('레벨') && description.includes('제작')) {
        const levelMatch = description.includes('2레벨') ? 2 : 
                          description.includes('3레벨') ? 3 : 
                          description.includes('4레벨') ? 4 : 1;
        const amountMatch = description.match(/(\d+)개/)?.[1] || 1;
        return [{ type: `create_level${levelMatch}`, amount: parseInt(amountMatch) }];
    }
    else if (description.includes('스테이지') && description.includes('클리어')) {
        const stageMatch = description.match(/스테이지\s*(\d+)-(\d+)/);
        if (stageMatch) {
            const world = stageMatch[1];
            const level = stageMatch[2];
            return [{ type: `stage_clear_${world}_${level}`, amount: 1 }];
        }
    }
    
    // 기본값 - 일반적인 퀘스트
    return [{ type: 'general', amount: 1 }];
}
