/**
 * Flora: 바캉스 아일랜드 - 머지 퍼즐 게임
 * 2D 퍼즐 게임의 핵심 로직과 UI 관리
 * 
 * 머지 규칙: 
 * - 동일한 종류와 레벨의 자원 2개가 인접(8방향)하면 자동으로 합성
 * - 1레벨 → 2레벨 → 3레벨 → 4레벨 순으로 진화
 * - 4레벨이 최고 단계이며, 4레벨 자원끼리는 더 이상 합성되지 않음
 * - 1~3레벨 자원들은 정상적으로 합성 가능
 */

// ===== 게임 상수 정의 =====
// 상수들은 js/constants.js에서 가져옴

// ===== 게임 데이터 구조 =====

/**
 * 플레이어 데이터 구조
 */
class Player {
    constructor() {
        this.level = 1;
        this.experience = 0;
        this.experienceToNext = 10; // 레벨 1 → 2에 필요한 경험치
        this.coins = 100;
        this.gems = 15; // 자동 머지 구매를 위해 젬을 늘림
        this.tickets = 3;
        this.inventory = [];
        this.unlockedStages = 1;
        this.currentStage = { world: 1, level: 1 };
        this.completedQuests = [];
        this.buildings = this.initializeBuildings();
        this.autoMergeCount = 0; // 자동 머지 아이템 개수
        this.rewardedLevels = new Set([1]); // 이미 보상을 받은 레벨 추적 (1레벨은 기본으로 처리됨)
        this.completedChapters = new Set(); // 완료한 챕터 추적
    }

    /**
     * 건물 초기화
     */
    initializeBuildings() {
                  return [
              { id: 'beach', name: '해변가', isBuilt: false, 
                goldCost: 150, // 건설에 필요한 골드 비용
                requirements: [
                  { type: 'water', level: 2, amount: 3 }, // sand를 water로 변경
                  { type: 'plant', level: 1, amount: 4 }
              ]},
              { id: 'resort', name: '리조트', isBuilt: false, 
                goldCost: 450, // 건설에 필요한 골드 비용
                requirements: [
                  { type: 'wood', level: 3, amount: 2 },
                  { type: 'water', level: 2, amount: 3 }
              ]},
              { id: 'pool', name: '수영장', isBuilt: false, 
                goldCost: 550, // 건설에 필요한 골드 비용
                requirements: [
                  { type: 'water', level: 3, amount: 1 },
                { type: 'water', level: 2, amount: 3 } // sand를 water로 변경
            ]}
        ];
    }

    /**
     * 경험치 추가
     */
    addExperience(amount) {
        console.log(`⭐ 경험치 추가: ${amount} (현재: ${this.experience}/${this.experienceToNext})`);
        this.experience += amount;
        while (this.experience >= this.experienceToNext) {
            this.experience -= this.experienceToNext;
            this.level++;
            console.log(`🎉 레벨업! 새 레벨: ${this.level}`);
            
            // 다음 레벨에 필요한 경험치 설정 (현재 레벨 + 1)
            this.experienceToNext = this.getExperienceRequired(this.level + 1);
            
            // 레벨업 보상 지급 (중복 방지)
            if (window.game && window.game.grantLevelUpReward && !this.rewardedLevels.has(this.level)) {
                console.log(`🎁 레벨업 보상 지급 시작 (레벨 ${this.level})`);
                this.rewardedLevels.add(this.level); // 보상 지급 기록
                window.game.grantLevelUpReward(this.level);
            } else if (this.rewardedLevels.has(this.level)) {
                console.log(`⚠️ 레벨 ${this.level} 보상은 이미 지급됨 - 스킵`);
            }
        }
        if (window.game && window.game.updateUI) {
            window.game.updateUI();
        }
    }

    /**
     * 레벨별 필요 경험치 정의
     * 각 레벨에 도달하기 위해 필요한 경험치
     */
    getExperienceRequired(targetLevel) {
        const requirements = {
            2: 10,   // 레벨 1 → 2
            3: 20,   // 레벨 2 → 3
            4: 30,   // 레벨 3 → 4
            5: 40,   // 레벨 4 → 5
            6: 60,   // 레벨 5 → 6
            7: 70,   // 레벨 6 → 7
            8: 80,   // 레벨 7 → 8
            9: 90,   // 레벨 8 → 9
            10: 100  // 레벨 9 → 10
        };
        
        return requirements[targetLevel] || 100; // 10레벨 이후는 100으로 고정
    }

    /**
     * 레벨업 보상 정의
     */
    getLevelUpRewards(level) {
        const rewards = {
            1: { type: 'gold', amount: 100, name: '골드 100개' },
            2: { type: 'resource_box_level2', amount: 1, name: '2단계 자원 선택 상자 1개' },
            3: { type: 'tickets', amount: 2, name: '스테이지 티켓 2개' },
            4: { type: 'spawn_bonus', amount: 5, name: '자원 생산 횟수 5회 추가' },
            5: { type: 'gems', amount: 30, name: '보석 30개' },
            6: { type: 'auto_merge', amount: 1, name: '자동 머지 아이템 1개' },
            7: { type: 'resource_box_level3', amount: 1, name: '3단계 자원 선택 상자 1개' },
            8: { type: 'gold', amount: 200, name: '골드 200개' },
            9: { type: 'gems', amount: 40, name: '보석 40개' }
        };
        
        return rewards[level] || null;
    }

    /**
     * 재화 추가
     */
    addCurrency(type, amount) {
        this[type] += amount;
        if (window.game && window.game.updateUI) {
            window.game.updateUI();
        }
    }

    /**
     * 재화 소모
     */
    spendCurrency(type, amount) {
        if (this[type] >= amount) {
            this[type] -= amount;
            if (window.game && window.game.updateUI) {
                window.game.updateUI();
            }
            return true;
        }
        return false;
    }

    // 자동 머지 개수 증가
    addAutoMerge(count = 1) {
        if (typeof count !== 'number' || count <= 0) return;
        this.autoMergeCount += count;
        if (window.game && window.game.updateAutoMergeUI) {
            window.game.updateAutoMergeUI();
        }
    }
    // 자동 머지 개수 차감
    useAutoMerge() {
        if (this.autoMergeCount > 0) {
            this.autoMergeCount--;
            if (window.game && window.game.updateAutoMergeUI) {
                window.game.updateAutoMergeUI();
            }
            return true;
        }
        return false;
    }
    // 자동 머지 개수 조회
    getAutoMergeCount() {
        return this.autoMergeCount;
    }
}

/**
 * 자원 데이터 구조
 */
class Resource {
    constructor(type, level, x = -1, y = -1) {
        this.id = Date.now() + Math.random();
        this.type = type; // water, sand, plant, wood
        this.level = level; // 1, 2, 3...
        this.x = x;
        this.y = y;
        this.element = null;
        this.imageElement = null;
        this.useImage = true; // 이미지 사용 여부
    }

    /**
     * 자원 이미지 경로 반환
     */
    getImagePath() {
        if (window.RESOURCE_IMAGES && window.RESOURCE_IMAGES[this.type] && window.RESOURCE_IMAGES[this.type][this.level]) {
            return window.RESOURCE_IMAGES[this.type][this.level];
        }
        return null;
    }

    /**
     * 자원 아이콘 반환 (이미지 로드 실패 시 대체용)
     */
    getIcon() {
        if (window.RESOURCE_ICONS && window.RESOURCE_ICONS[this.type]) {
            return window.RESOURCE_ICONS[this.type][this.level - 1] || '❓';
        }
        return '❓';
    }

    /**
     * 자원 이름 반환
     */
    getName() {
        if (window.RESOURCE_NAMES && window.RESOURCE_NAMES[this.type]) {
            return window.RESOURCE_NAMES[this.type];
        }
        const baseNames = {
            water: '벽돌',
            sand: '파라솔',
            plant: '식물',
            wood: '나무'
        };
        return baseNames[this.type] || '알 수 없음';
    }

    /**
     * 다음 레벨로 진화 가능한지 확인
     */
    canEvolve() {
        return this.level < 4; // 최대 레벨 4
    }

    /**
     * 진화
     */
    evolve() {
        if (this.canEvolve()) {
            this.level++;
            if (this.element) {
                this.updateDisplay();
            }
        }
    }

    /**
     * DOM 요소 업데이트
     */
    updateDisplay() {
        if (this.element) {
            if (this.useImage && this.getImagePath()) {
                this.createImageElement();
            } else {
                this.createIconElement();
            }
            this.element.className = `resource-item resource-${this.type} level-${this.level}`;
            this.element.title = `${this.getName()} (레벨 ${this.level})`;
        }
    }

    /**
     * 이미지 요소 생성
     */
    createImageElement() {
        if (!this.element) return;
        
        // 기존 내용 제거
        this.element.innerHTML = '';
        
        // 이미지 요소 생성
        const img = document.createElement('img');
        img.src = this.getImagePath();
        img.alt = `${this.getName()} 레벨 ${this.level}`;
        img.className = 'resource-image';
        img.style.width = '100%';
        img.style.height = '100%';
        img.style.objectFit = 'contain';
        
        // 이미지 로드 실패 시 아이콘으로 대체
        img.onerror = () => {
            console.warn(`이미지 로드 실패: ${this.getImagePath()}, 아이콘으로 대체`);
            this.useImage = false;
            this.createIconElement();
        };
        
        this.element.appendChild(img);
        this.imageElement = img;
    }

    /**
     * 아이콘 요소 생성
     */
    createIconElement() {
        if (!this.element) return;
        
        // 기존 내용 제거
        this.element.innerHTML = '';
        
        // 아이콘 요소 생성
        const icon = document.createElement('span');
        icon.textContent = this.getIcon();
        icon.className = 'resource-icon';
        icon.style.fontSize = '24px';
        icon.style.display = 'flex';
        icon.style.alignItems = 'center';
        icon.style.justifyContent = 'center';
        icon.style.width = '100%';
        icon.style.height = '100%';
        
        this.element.appendChild(icon);
        this.imageElement = null;
    }
}

/**
 * 스테이지 데이터 구조
 */
class Stage {
    constructor(world, level, objectives, rewards, ticketCost = 1) {
        this.world = world;
        this.level = level;
        this.objectives = objectives; // [{ type: 'create', resourceType: 'water', resourceLevel: 3, amount: 1 }]
        this.rewards = rewards; // [{ type: 'coins', amount: 50 }]
        this.ticketCost = ticketCost;
        this.completed = false;
        this.progress = {};
        this.clearCondition = 'target'; // 'target' 또는 'obstacles'
        this.obstacles = []; // 장애물 배열
        
        // 스테이지별 보드 크기 설정
        this.boardSize = this.getBoardSize(level);
        
        // 1-1부터 1-5까지 쓰레기 장애물 스테이지
        if (world === 1 && level >= 1 && level <= 5) {
            this.clearCondition = 'obstacles';
            
            // 1-1 스테이지: 쓰레기 1개 (5x5 보드)
            if (level === 1) {
                this.obstacles = [
                    { type: 'garbage', maxHp: 60, x: 2, y: 2 } // 중앙
                ];
            }
            
            // 1-2 스테이지: 쓰레기 2개 (6x6 보드)
            else if (level === 2) {
                this.obstacles = [
                    { type: 'garbage', maxHp: 80, x: 2, y: 2 },
                    { type: 'recycling', maxHp: 60, x: 3, y: 3 }
                ];
            }
            
            // 1-3 스테이지: 쓰레기 3개 (6x6 보드)
            else if (level === 3) {
                this.obstacles = [
                    { type: 'big_garbage', maxHp: 120, x: 2, y: 1 },
                    { type: 'garbage', maxHp: 80, x: 1, y: 3 },
                    { type: 'compost', maxHp: 50, x: 4, y: 4 }
                ];
            }
            
            // 1-4 스테이지: 쓰레기 4개 (7x7 보드)
            else if (level === 4) {
                this.obstacles = [
                    { type: 'toxic_garbage', maxHp: 150, x: 3, y: 3 }, // 중앙
                    { type: 'big_garbage', maxHp: 120, x: 1, y: 1 },
                    { type: 'big_garbage', maxHp: 120, x: 5, y: 5 },
                    { type: 'garbage', maxHp: 80, x: 1, y: 5 }
                ];
            }
            
            // 1-5 스테이지: 쓰레기 5개 (7x7 보드)
            else if (level === 5) {
                this.obstacles = [
                    { type: 'big_garbage', maxHp: 250, x: 3, y: 3 }, // 중앙 보스
                    { type: 'toxic_garbage', maxHp: 180, x: 1, y: 1 },
                    { type: 'toxic_garbage', maxHp: 180, x: 5, y: 1 },
                    { type: 'big_garbage', maxHp: 150, x: 1, y: 5 },
                    { type: 'big_garbage', maxHp: 150, x: 5, y: 5 }
                ];
            }
        }
    }

    /**
     * 스테이지별 보드 크기 반환
     */
    getBoardSize(level) {
        // 1-1: 5x5
        if (level === 1) {
            return 5;
        }
        // 1-2, 1-3: 6x6
        else if (level === 2 || level === 3) {
            return 6;
        }
        // 1-4, 1-5: 7x7
        else if (level === 4 || level === 5) {
            return 7;
        }
        // 기본값
        return 5;
    }

    /**
     * 목표 달성 여부 확인
     */
    checkCompletion() {
        // 장애물 파괴 조건인 경우
        if (this.clearCondition === 'obstacles') {
            // Game 인스턴스를 통해 장애물 상태 확인
            return window.game && window.game.trashObstacles.length === 0;
        }
        
        // 기존 목표 달성 조건
        return this.objectives.every(objective => {
            const key = `${objective.type}_${objective.resourceType}_${objective.resourceLevel}`;
            return (this.progress[key] || 0) >= objective.amount;
        });
    }

    /**
     * 진행도 업데이트
     */
    updateProgress(type, resourceType, resourceLevel, amount = 1) {
        const key = `${type}_${resourceType}_${resourceLevel}`;
        this.progress[key] = (this.progress[key] || 0) + amount;
    }

    /**
     * 스테이지 설명 반환
     */
    getDescription() {
        return this.objectives.map(obj => {
            const resource = new Resource(obj.resourceType, obj.resourceLevel);
            return `${resource.getName()} ${obj.amount}개 생성`;
        }).join(', ');
    }
}

/**
 * 장애물 클래스 (서브 머지 전용)
 */
class TrashObstacle {
    constructor(type = 'garbage', maxHp = 100) {
        this.type = type; // 'garbage', 'big_garbage', 'toxic_garbage' 등
        this.maxHp = maxHp;
        this.currentHp = maxHp;
        this.x = -1;
        this.y = -1;
        this.element = null;
    }

    /**
     * 장애물이 대미지를 받음
     */
    takeDamage(damage) {
        const previousHp = this.currentHp;
        this.currentHp = Math.max(0, this.currentHp - damage);
        
        // HP 변경 로그
        console.log(`💥 장애물 대미지: ${damage} (${previousHp} → ${this.currentHp})`);
        
        // 즉시 시각적 상태 업데이트
        this.updateVisualState();
        
        // HP가 0 이하가 되면 파괴됨
        const isDestroyed = this.currentHp <= 0;
        if (isDestroyed) {
            console.log(`💀 장애물 파괴됨: ${this.type}`);
        }
        
        return isDestroyed;
    }

    /**
     * 장애물의 시각적 상태 업데이트
     */
    updateVisualState() {
        if (!this.element) return;

        const hpPercentage = (this.currentHp / this.maxHp) * 100;
        
        // HP에 따라 시각적 변화
        if (hpPercentage > 66) {
            this.element.style.filter = 'none';
            this.element.style.opacity = '1';
        } else if (hpPercentage > 33) {
            this.element.style.filter = 'brightness(0.8) saturate(0.9)';
            this.element.style.opacity = '0.9';
        } else if (hpPercentage > 0) {
            this.element.style.filter = 'brightness(0.6) saturate(0.7)';
            this.element.style.opacity = '0.8';
        }

        // HP 바 즉시 업데이트
        const hpBar = this.element.querySelector('.trash-hp-bar');
        if (hpBar) {
            const hpFill = hpBar.querySelector('.hp-fill');
            if (hpFill) {
                // 부드러운 애니메이션으로 HP 바 업데이트
                hpFill.style.transition = 'width 0.3s ease, background-color 0.3s ease';
                hpFill.style.width = `${hpPercentage}%`;
                
                // HP에 따라 색상 변경
                if (hpPercentage > 66) {
                    hpFill.style.background = '#27AE60';
                } else if (hpPercentage > 33) {
                    hpFill.style.background = '#F39C12';
                } else {
                    hpFill.style.background = '#E74C3C';
                }
            }
        }

        // HP 텍스트 즉시 업데이트
        const hpText = this.element.querySelector('.trash-hp-text');
        if (hpText) {
            hpText.textContent = `${this.currentHp}/${this.maxHp}`;
            
            // HP가 낮을 때 텍스트 색상 변경으로 시각적 경고
            if (hpPercentage <= 33) {
                hpText.style.color = '#FF6B6B';
                hpText.style.textShadow = '0 0 5px rgba(255, 107, 107, 0.8)';
            } else if (hpPercentage <= 66) {
                hpText.style.color = '#FFA500';
                hpText.style.textShadow = '0 0 5px rgba(255, 165, 0, 0.8)';
            } else {
                hpText.style.color = 'white';
                hpText.style.textShadow = '0 1px 2px rgba(0, 0, 0, 0.8)';
            }
        }

        // HP가 낮을 때 전체 장애물에 경고 효과 추가
        if (hpPercentage <= 25) {
            this.element.style.animation = 'pulse-warning 1s ease-in-out infinite';
        } else {
            this.element.style.animation = 'none';
        }
    }

    /**
     * 장애물 아이콘 반환 (이미지 파일 사용)
     */
    getIcon() {
        // 현재 스테이지 레벨에 따라 다른 이미지 사용
        const currentStageLevel = window.game?.currentStage?.level || 1;
        
        const stageImages = {
            1: 'Art/Grass.png',      // 1단계: Grass.png
            2: 'Art/Garbage.png',    // 2단계: Garbage.png
            3: 'Art/Boat.png',       // 3단계: Boat.png
            4: 'Art/Rock.png'        // 4단계: Rock.png
        };
        
        // 5단계는 4단계와 동일한 이미지 사용
        const imageFile = stageImages[currentStageLevel] || stageImages[4];
        
        return `<img src="${imageFile}" alt="장애물" style="width: 100%; height: 100%; object-fit: contain;">`;
    }

    /**
     * 장애물 이름 반환
     */
    getName() {
        const names = {
            'garbage': '쓰레기 봉투',
            'big_garbage': '대형 쓰레기',
            'toxic_garbage': '독성 쓰레기',
            'recycling': '재활용품',
            'compost': '음식물 쓰레기'
        };
        return names[this.type] || '쓰레기';
    }

    /**
     * 장애물별 특수 효과 (파괴 시)
     */
    getDestroyEffect() {
        const effects = {
            'garbage': { coins: 3, message: '🗑️ 쓰레기 정리 완료!' },
            'big_garbage': { coins: 8, gems: 1, message: '🛢️ 대형 쓰레기 처리!' },
            'toxic_garbage': { coins: 5, gems: 2, message: '☢️ 독성 쓰레기 안전 처리!' },
            'recycling': { coins: 4, message: '♻️ 재활용품 분리수거!' },
            'compost': { coins: 2, message: '🍂 음식물 쓰레기 처리!' }
        };
        return effects[this.type] || { coins: 3, message: '🗑️ 쓰레기 처리 완료!' };
    }
}

/**
 * 퀘스트 데이터 구조
 */
class Quest {
    constructor(id, title, description, objectives, rewards) {
        this.id = id;
        this.title = title;
        this.description = description;
        this.objectives = objectives; // [{ type: 'merge', amount: 5 }]
        this.rewards = rewards; // [{ type: 'coins', amount: 100 }]
        this.progress = {};
        this.completed = false;
    }

    /**
     * 퀘스트 완료 여부 확인
     */
    checkCompletion() {
        return this.objectives.every(objective => {
            return (this.progress[objective.type] || 0) >= objective.amount;
        });
    }

    /**
     * 진행도 업데이트
     */
    updateProgress(type, amount = 1) {
        this.progress[type] = (this.progress[type] || 0) + amount;
        if (this.checkCompletion() && !this.completed) {
            this.completed = true;
            this.completedTime = Date.now(); // 완료 시간 기록
            if (window.game && window.game.completeQuest) {
                window.game.completeQuest(this);
            }
        }
    }
}

// ===== 게임 엔진 클래스 =====

/**
 * 메인 게임 클래스
 */
class Game {
    constructor() {
        this.player = new Player();
        this.board = Array(5).fill(null).map(() => Array(5).fill(null));
        this.stageBoard = Array(5).fill(null).map(() => Array(5).fill(null));
        this.stageBoardSize = 5; // 동적 스테이지 보드 크기
        this.trashObstacles = []; // 서브 머지 쓰레기 장애물 배열
        this.selectedStage = { world: 1, level: 1 }; // 선택된 스테이지
        this.selectedCell = null;
        this.draggedResource = null;
        this.gameState = 'loading'; // loading, main, stage, shop
        this.stages = this.initializeStages();
        this.quests = this.initializeQuests();
        this.mergeHistory = [];
        
        // 새로운 시스템 관련 속성
        this.sellMode = false;
        this.spawnCooldownTime = 30; // 30초 쿨타임
        this.lastSpawnTime = 0;
        this.spawnCooldownTimer = null;
        
        // 자원 생성 한계 시스템
        this.maxSpawnCount = 15; // 최대 15개 생성 가능
        this.currentSpawnCount = 15; // 현재 남은 생성 횟수
        this.isSpawnCooldown = false; // 쿨타임 상태
        
        // 초기화 플래그
        this.isResetting = false; // 초기화 중인지 여부
        
        // 음악 설정
        this.isMusicEnabled = true; // 음악 활성화 상태
        
        this.init();
    }

    /**
     * 게임 초기화
     */
    async init() {
        this.showLoadingScreen();
        await this.loadGameData();
        await this.delay(3000); // 로딩 애니메이션
        this.hideLoadingScreen();
        
        // DOM 요소 존재 확인
        if (!this.checkDOMElements()) {
            console.error('❌ 필수 DOM 요소가 누락되어 게임을 시작할 수 없습니다.');
            return;
        }
        
        this.showMainScreen();
        
        // 판매 모드 버튼 상태 확인
        const sellModeButton = document.getElementById('sell-mode');
        console.log('🔍 init에서 판매 모드 버튼 확인:', sellModeButton);
        if (sellModeButton) {
            console.log('🔍 판매 모드 버튼 속성들:', {
                id: sellModeButton.id,
                className: sellModeButton.className,
                textContent: sellModeButton.textContent,
                disabled: sellModeButton.disabled,
                style: sellModeButton.style.cssText
            });
        }
        
        this.initializeEventListeners();
        this.spawnInitialResources();
        this.updateUI();
        this.updateSurroundingBuildings(); // 주변 건물 로드
        this.setupAutoSave(); // 자동 저장 설정
        
        // 게임 시작 시 배경음악 재생 (사용자 상호작용 후)
        this.setupBackgroundMusic();
        
        // 초기 음악 버튼 텍스트 설정
        this.updateMusicButtonText();
        
        // 음악이 비활성화되어 있다면 모든 오디오 요소를 정지
        if (!this.isMusicEnabled) {
            const allAudioElements = document.querySelectorAll('audio');
            allAudioElements.forEach(audio => {
                audio.pause();
                audio.currentTime = 0;
                audio.muted = true;
            });
            console.log('🔇 초기화 시 음악이 비활성화되어 모든 음악을 정지했습니다');
        }
        
        console.log('🎮 게임 초기화 완료');
    }

    /**
     * 지연 함수
     */
    delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    /**
     * 배경음악 재생
     */
    playBackgroundMusic() {
        // 음악이 비활성화되어 있으면 재생하지 않음
        if (!this.isMusicEnabled) {
            console.log('🔇 음악이 비활성화되어 있어 재생하지 않습니다');
            return;
        }
        
        const bgMusic = document.getElementById('background-music');
        if (bgMusic) {
            // 이미 재생 중인지 확인
            if (!bgMusic.paused) {
                console.log('🎵 배경음악이 이미 재생 중입니다');
                return;
            }
            
            bgMusic.volume = 0.3; // 볼륨을 30%로 설정
            bgMusic.muted = false; // 음소거 해제
            bgMusic.play().catch(error => {
                console.log('🎵 배경음악 자동 재생 실패 (사용자 상호작용 필요):', error);
            });
            console.log('🎵 배경음악 재생 시작');
        }
    }

    /**
     * 배경음악 정지
     */
    stopBackgroundMusic() {
        const bgMusic = document.getElementById('background-music');
        if (bgMusic) {
            bgMusic.pause();
            bgMusic.currentTime = 0;
            bgMusic.muted = true; // 음소거로 확실하게 정지
            console.log('🎵 배경음악 정지');
        }
    }

    /**
     * 스테이지 음악 재생
     */
    playStageMusic() {
        // 음악이 비활성화되어 있으면 재생하지 않음
        if (!this.isMusicEnabled) {
            console.log('🔇 음악이 비활성화되어 있어 스테이지 음악을 재생하지 않습니다');
            return;
        }
        
        const stageMusic = document.getElementById('stage-music');
        if (stageMusic) {
            // 이미 재생 중인지 확인
            if (!stageMusic.paused) {
                console.log('🎵 스테이지 음악이 이미 재생 중입니다');
                return;
            }
            
            stageMusic.volume = 0.3; // 볼륨을 30%로 설정
            stageMusic.muted = false; // 음소거 해제
            stageMusic.play().catch(error => {
                console.log('🎵 스테이지 음악 자동 재생 실패 (사용자 상호작용 필요):', error);
            });
            console.log('🎵 스테이지 음악 재생 시작');
        }
    }

    /**
     * 스테이지 음악 정지
     */
    stopStageMusic() {
        const stageMusic = document.getElementById('stage-music');
        if (stageMusic) {
            stageMusic.pause();
            stageMusic.currentTime = 0;
            stageMusic.muted = true; // 음소거로 확실하게 정지
            console.log('🎵 스테이지 음악 정지');
        }
    }

    /**
     * 배경음악 볼륨 조절
     */
    setBackgroundMusicVolume(volume) {
        const bgMusic = document.getElementById('background-music');
        const stageMusic = document.getElementById('stage-music');
        
        if (bgMusic) {
            bgMusic.volume = Math.max(0, Math.min(1, volume)); // 0~1 사이 값으로 제한
            console.log(`🎵 배경음악 볼륨 설정: ${Math.round(bgMusic.volume * 100)}%`);
        }
        
        if (stageMusic) {
            stageMusic.volume = Math.max(0, Math.min(1, volume)); // 0~1 사이 값으로 제한
            console.log(`🎵 스테이지 음악 볼륨 설정: ${Math.round(stageMusic.volume * 100)}%`);
        }
    }

    /**
     * 배경음악 설정 (사용자 상호작용 후 자동 재생)
     */
    setupBackgroundMusic() {
        // 음악이 비활성화되어 있으면 자동 재생 설정하지 않음
        if (!this.isMusicEnabled) {
            console.log('🔇 음악이 비활성화되어 있어 자동 재생을 설정하지 않습니다');
            return;
        }
        
        // 기존 이벤트 리스너가 있다면 제거 (중복 등록 방지)
        if (this.startMusicHandler) {
            document.removeEventListener('click', this.startMusicHandler);
            document.removeEventListener('keydown', this.startMusicHandler);
            document.removeEventListener('touchstart', this.startMusicHandler);
        }
        
        // 사용자 상호작용 후 배경음악 재생을 위한 이벤트 리스너 설정
        this.startMusicHandler = () => {
            // 음악이 비활성화되어 있다면 재생하지 않음
            if (!this.isMusicEnabled) {
                console.log('🔇 음악이 비활성화되어 있어 자동 재생을 중단합니다');
                return;
            }
            
            // 이미 음악이 재생 중인지 확인
            const bgMusic = document.getElementById('background-music');
            const stageMusic = document.getElementById('stage-music');
            
            if (this.gameState === 'main' && bgMusic && bgMusic.paused) {
                this.playBackgroundMusic();
            } else if (this.gameState === 'stage' && stageMusic && stageMusic.paused) {
                this.playStageMusic();
            }
            
            // 이벤트 리스너 제거 (한 번만 실행)
            document.removeEventListener('click', this.startMusicHandler);
            document.removeEventListener('keydown', this.startMusicHandler);
            document.removeEventListener('touchstart', this.startMusicHandler);
        };

        // 클릭, 키보드, 터치 이벤트에 리스너 추가
        document.addEventListener('click', this.startMusicHandler);
        document.addEventListener('keydown', this.startMusicHandler);
        document.addEventListener('touchstart', this.startMusicHandler);
        
        console.log('🎵 음악 자동 재생 설정 완료 (사용자 상호작용 대기 중)');
    }

    /**
     * 배경음악 재생/정지 토글
     */
    toggleBackgroundMusic() {
        // 이미 처리 중인 경우 중복 실행 방지
        if (this.isTogglingMusic) {
            console.log('🔄 음악 토글 처리 중입니다. 중복 실행을 방지합니다.');
            return;
        }
        
        this.isTogglingMusic = true;
        
        try {
            // 음악 상태 토글
            this.isMusicEnabled = !this.isMusicEnabled;
            
            if (this.isMusicEnabled) {
                // 음악 활성화 - 현재 게임 상태에 맞는 음악만 재생
                this.showNotification('🎵 음악이 켜집니다');
                
                // 현재 게임 상태에 따라 적절한 음악 재생 (자동 재생은 하지 않음)
                // 사용자가 직접 상호작용할 때 재생되도록 setupBackgroundMusic 호출
                this.setupBackgroundMusic();
            } else {
                // 음악 비활성화 - 모든 오디오 요소를 확실하게 정지
                this.stopBackgroundMusic();
                this.stopStageMusic();
                
                // 추가로 모든 오디오 요소를 음소거하여 확실하게 정지
                const allAudioElements = document.querySelectorAll('audio');
                allAudioElements.forEach(audio => {
                    audio.pause();
                    audio.currentTime = 0;
                    audio.muted = true;
                    audio.volume = 0; // 볼륨도 0으로 설정
                });
                
                // 이벤트 리스너도 제거하여 자동 재생 방지
                if (this.startMusicHandler) {
                    document.removeEventListener('click', this.startMusicHandler);
                    document.removeEventListener('keydown', this.startMusicHandler);
                    document.removeEventListener('touchstart', this.startMusicHandler);
                }
                
                this.showNotification('🔇 모든 음악이 꺼집니다');
            }
            
            // 음악 버튼 텍스트 업데이트
            this.updateMusicButtonText();
            
            // 음악 설정을 로컬 스토리지에 저장
            localStorage.setItem('flora_music_enabled', this.isMusicEnabled.toString());
            
            // 게임 데이터에도 저장
            this.saveGameData();
            
            console.log(`🎵 음악 상태 변경: ${this.isMusicEnabled ? '켜짐' : '꺼짐'}`);
        } finally {
            // 처리 완료 후 플래그 해제
            this.isTogglingMusic = false;
        }
    }

    /**
     * 음악 버튼 텍스트 업데이트
     */
    updateMusicButtonText() {
        const settingsBtn = document.getElementById('settings-btn');
        if (settingsBtn) {
            if (this.isMusicEnabled) {
                settingsBtn.innerHTML = '🔇 음악 끄기';
            } else {
                settingsBtn.innerHTML = '🎵 음악 켜기';
            }
        }
    }

    /**
     * 스테이지 초기화
     */
    initializeStages() {
        const stages = [];
        for (let world = 1; world <= 3; world++) {
            for (let level = 1; level <= 10; level++) {
                const objectives = [
                    { type: 'create', resourceType: 'water', resourceLevel: Math.min(level, 3), amount: 1 }
                ];
                const rewards = [
                    { type: 'coins', amount: 25 * level },
                    { type: 'experience', amount: 10 * level }
                ];
                stages.push(new Stage(world, level, objectives, rewards));
            }
        }
        return stages;
    }

    /**
     * 퀘스트 초기화
     */
    initializeQuests() {
        return [
            new Quest('quest1', '1+1=?', 
                '1단계 아이템 3회 합성하기', 
                [{ type: 'merge_level1', amount: 3 }], 
                [
                    { type: 'experience', amount: 10 },
                    { type: 'gems', amount: 3 },
                    { type: 'coins', amount: 200 }
                ]),
            new Quest('quest2', '알뜰살뜰한 생활', 
                '아이템 1회 판매하기', 
                [{ type: 'sell', amount: 1 }], 
                [
                    { type: 'experience', amount: 15 },
                    { type: 'gems', amount: 5 },
                    { type: 'tickets', amount: 1 },
                    { type: 'coins', amount: 10 }
                ]),
            new Quest('quest3', '자원이 더 필요해!', 
                '자원 생산 횟수 15번 모두 소진하기', 
                [{ type: 'spawn_exhaust', amount: 1 }], 
                [
                    { type: 'experience', amount: 10 },
                    { type: 'gems', amount: 10 },
                    { type: 'resource_level2', amount: 2 },
                    { type: 'coins', amount: 20 }
                ]),
            new Quest('quest4', '여긴 어디야?', 
                '스테이지 1-1 단계 클리어 하기', 
                [{ type: 'stage_clear_1_1', amount: 1 }], 
                [
                    { type: 'experience', amount: 20 },
                    { type: 'gems', amount: 5 },
                    { type: 'coins', amount: 50 }
                ]),
            new Quest('quest5', '폭염 속 안식처', 
                '해변가 건물 건설하기', 
                [{ type: 'building_beach', amount: 1 }], 
                [
                    { type: 'experience', amount: 70 },
                    { type: 'gems', amount: 7 },
                    { type: 'coins', amount: 110 }
                ]),
            new Quest('quest6', '휴양지의 첫 그늘', 
                '리조트 건물 건설하기', 
                [{ type: 'building_resort', amount: 1 }], 
                [
                    { type: 'experience', amount: 80 },
                    { type: 'gems', amount: 8 },
                    { type: 'coins', amount: 120 }
                ]),
            new Quest('quest7', '여름엔 물놀이지!', 
                '수영장 건물 건설하기', 
                [{ type: 'building_pool', amount: 1 }], 
                [
                    { type: 'experience', amount: 90 },
                    { type: 'gems', amount: 9 },
                    { type: 'coins', amount: 130 }
                ])
        ];
    }

    /**
     * 초기 자원 생성
     */
    spawnInitialResources() {
        const resourceTypes = ['water', 'brick', 'plant', 'wood']; // sand -> brick
        
        // 저장된 보드 데이터가 없을 때만 초기 자원 생성
        const savedData = localStorage.getItem('floraGame');
        let hasExistingBoard = false;
        
        if (savedData) {
            try {
                const data = JSON.parse(savedData);
                if (data.board) {
                    // 저장된 보드에 자원이 있는지 확인
                    hasExistingBoard = data.board.some(row => 
                        row && row.some(cell => cell !== null)
                    );
                }
            } catch (e) {
                console.warn('보드 데이터 확인 중 오류:', e);
            }
        }
        
        // 기존 보드 데이터가 없을 때만 초기 자원 생성
        if (!hasExistingBoard) {
            for (let i = 0; i < 8; i++) {
                this.spawnRandomResource();
            }
        }
    }

    /**
     * 강제 초기 자원 생성 (초기화 시 사용)
     */
    forceSpawnInitialResources() {
        // 보드가 비어있는지 확인
        let isEmpty = true;
        for (let y = 0; y < 5; y++) {
            for (let x = 0; x < 5; x++) {
                if (this.board[y][x]) {
                    isEmpty = false;
                    break;
                }
            }
            if (!isEmpty) break;
        }
        
        // 비어있으면 초기 자원 생성
        if (isEmpty) {
            for (let i = 0; i < 8; i++) {
                this.spawnRandomResource();
            }
        }
    }

    /**
     * 랜덤 자원 생성 (항상 1레벨 자원만 생성)
     */
    spawnRandomResource(targetBoard = 'main') {
        // 디버깅용: resourceTypes 배열 출력
        const resourceTypes = ['water', 'brick', 'plant', 'wood']; // sand -> brick
        console.log('resourceTypes:', resourceTypes);
        const board = targetBoard === 'main' ? this.board : this.stageBoard;
        const boardSize = targetBoard === 'main' ? 5 : this.stageBoardSize;
        const emptyCells = [];

        // 빈 칸 찾기
        for (let y = 0; y < boardSize; y++) {
            for (let x = 0; x < boardSize; x++) {
                if (!board[y][x]) {
                    // 서브 머지에서는 장애물이 있는 칸도 제외
                    if (targetBoard === 'stage') {
                        const hasObstacle = this.trashObstacles.some(obstacle => 
                            obstacle.x === x && obstacle.y === y
                        );
                        if (!hasObstacle) {
                            emptyCells.push({ x, y });
                        }
                    } else {
                        emptyCells.push({ x, y });
                    }
                }
            }
        }

        if (emptyCells.length === 0) {
            console.log(`⚠️ ${targetBoard} 보드에 빈 칸이 없습니다!`);
            return null;
        }

        // 서브 머지 스테이지 모드에서만 자원 생성 제한 확인
        if (targetBoard === 'stage' && this.gameState === 'stage' && this.stageMaxSpawnCount !== undefined) {
            const currentStageResourceCount = this.getCurrentStageResourceCount();
            if (currentStageResourceCount >= this.stageMaxSpawnCount) {
                console.log(`⚠️ 서브 머지 스테이지 자원 생성 제한에 도달했습니다. (${currentStageResourceCount}/${this.stageMaxSpawnCount})`);
                return null;
            }
        }

        // 랜덤 빈 칸 선택
        const randomCell = emptyCells[Math.floor(Math.random() * emptyCells.length)];
        // 디버깅용: 무조건 water만 생성하려면 아래 주석 해제
        // const randomType = 'water';
        const randomType = resourceTypes[Math.floor(Math.random() * resourceTypes.length)];
        console.log('randomType:', randomType);
        if (randomType === 'water') {
            console.log('water 생성 시도!');
        }
        const level = 1; // 무조건 1레벨 자원만 생성

        const resource = new Resource(randomType, level, randomCell.x, randomCell.y);
        board[randomCell.y][randomCell.x] = resource;

        console.log(`✅ ${targetBoard} 보드에 자원 생성: ${resource.getName()} at (${randomCell.x}, ${randomCell.y})`);
        this.renderBoard(targetBoard);
        
        // 메인 보드에 자원 생성 시 저장 및 건물 목록 UI 업데이트
        if (targetBoard === 'main') {
            this.saveGameData();
            this.updateBuildingUI();
        }
        
        return resource;
    }

    /**
     * 게임 데이터 로드
     */
    async loadGameData() {
        // 초기화 중이면 저장된 데이터를 로드하지 않음
        if (this.isResetting) {
            console.log('🔄 게임 초기화 중... 저장된 데이터를 무시합니다.');
            return;
        }
        
        // 음악 설정 로드
        const savedMusicEnabled = localStorage.getItem('flora_music_enabled');
        if (savedMusicEnabled !== null) {
            this.isMusicEnabled = savedMusicEnabled === 'true';
            console.log(`🎵 음악 설정 복원: ${this.isMusicEnabled ? '켜짐' : '꺼짐'}`);
            
            // 음악이 비활성화되어 있다면 모든 오디오 요소를 정지
            if (!this.isMusicEnabled) {
                const allAudioElements = document.querySelectorAll('audio');
                allAudioElements.forEach(audio => {
                    audio.pause();
                    audio.currentTime = 0;
                    audio.muted = true;
                });
                console.log('🔇 저장된 음악 설정에 따라 모든 음악을 정지했습니다');
            }
        }
        
        const savedData = localStorage.getItem('floraGame');
        if (savedData) {
            try {
                const data = JSON.parse(savedData);
                Object.assign(this.player, data.player);
                
                // rewardedLevels를 Set 타입으로 복원
                if (data.player.rewardedLevels) {
                    this.player.rewardedLevels = new Set(data.player.rewardedLevels);
                } else {
                    // 기존 저장 데이터에 rewardedLevels가 없으면 현재 레벨까지 모든 레벨을 보상받은 것으로 처리
                    this.player.rewardedLevels = new Set();
                    for (let i = 1; i <= this.player.level; i++) {
                        this.player.rewardedLevels.add(i);
                    }
                }
                console.log('🎁 보상받은 레벨 복원:', Array.from(this.player.rewardedLevels));
                
                // completedChapters를 Set 타입으로 복원
                if (data.player.completedChapters) {
                    this.player.completedChapters = new Set(data.player.completedChapters);
                } else {
                    this.player.completedChapters = new Set();
                }
                console.log('🏆 완료한 챕터 복원:', Array.from(this.player.completedChapters));
                
                // 보드 데이터 복원
                if (data.board) {
                    this.loadBoardData(data.board, 'main');
                }
                if (data.stageBoard) {
                    this.loadBoardData(data.stageBoard, 'stage');
                }
                
                // 퀘스트 진행도 복원
                if (data.quests) {
                    this.loadQuestData(data.quests);
                }
                
                // 머지 히스토리 복원
                if (data.mergeHistory) {
                    this.mergeHistory = data.mergeHistory;
                }
                
                // 자원 생성 시스템 복원
                if (data.spawnSystemData) {
                    this.maxSpawnCount = data.spawnSystemData.maxSpawnCount || 15;
                    this.currentSpawnCount = data.spawnSystemData.currentSpawnCount || this.maxSpawnCount;
                    this.isSpawnCooldown = data.spawnSystemData.isSpawnCooldown || false;
                    this.lastSpawnTime = data.spawnSystemData.lastSpawnTime || 0;
                    
                    // 쿨타임이 진행 중이었다면 복원
                    if (this.isSpawnCooldown && this.lastSpawnTime > 0) {
                        const currentTime = Date.now();
                        const timeSinceLastSpawn = (currentTime - this.lastSpawnTime) / 1000;
                        
                        if (timeSinceLastSpawn < this.spawnCooldownTime) {
                            // 아직 쿨타임 중이라면 타이머 재시작
                            const remainingTime = Math.ceil(this.spawnCooldownTime - timeSinceLastSpawn);
                            setTimeout(() => this.startSpawnCooldownWithTime(remainingTime), 100);
                        } else {
                            // 쿨타임이 끝났다면 초기화
                            this.isSpawnCooldown = false;
                            this.currentSpawnCount = this.maxSpawnCount;
                        }
                    }
                }
                
                // 게임 시스템 데이터 복원
                if (data.gameSystemData) {
                    if (data.gameSystemData.selectedStage) {
                        this.selectedStage = data.gameSystemData.selectedStage;
                    }
                    // 음악 설정이 저장되어 있다면 복원 (기존 로컬 스토리지 설정보다 우선)
                    if (data.gameSystemData.isMusicEnabled !== undefined) {
                        this.isMusicEnabled = data.gameSystemData.isMusicEnabled;
                        console.log(`🎵 게임 데이터에서 음악 설정 복원: ${this.isMusicEnabled ? '켜짐' : '꺼짐'}`);
                    }
                }
                
            } catch (e) {
                console.warn('저장된 데이터를 불러올 수 없습니다:', e);
            }
        }
    }

    /**
     * 레벨업 보상 지급
     */
    grantLevelUpReward(level) {
        console.log(`🎉 레벨업 보상 지급 함수 호출: 레벨 ${level}`);
        const reward = this.player.getLevelUpRewards(level);
        if (!reward) {
            console.log(`❌ 레벨 ${level}에 대한 보상 정보가 없습니다.`);
            return;
        }
        console.log(`🎁 보상 정보:`, reward);

        let rewardMessage = `🎉 레벨 ${level} 달성!\\n🎁 보상: ${reward.name}`;

        switch (reward.type) {
            case 'gold':
                this.player.addCurrency('coins', reward.amount);
                break;
            
            case 'tickets':
                this.player.addCurrency('tickets', reward.amount);
                break;
            
            case 'gems':
                this.player.addCurrency('gems', reward.amount);
                break;
            
            case 'spawn_bonus':
                this.maxSpawnCount += reward.amount;
                this.currentSpawnCount += reward.amount;
                rewardMessage += `\\n📈 최대 생산 횟수: ${this.maxSpawnCount}회`;
                break;
            
            case 'auto_merge':
                this.player.addAutoMerge(reward.amount);
                rewardMessage += `\n🔄 자동 머지 아이템 +${reward.amount}`;
                break;
            
            case 'resource_box_level2':
                this.showResourceSelectionBox(2, reward.amount);
                return; // 선택 상자는 별도 처리
            
            case 'resource_box_level3':
                this.showResourceSelectionBox(3, reward.amount);
                return; // 선택 상자는 별도 처리
        }

        this.showNotification(rewardMessage);
        this.updateSpawnUI();
        this.saveGameData();
    }

    /**
     * 자원 선택 상자 표시
     */
    showResourceSelectionBox(level, amount) {
        console.log(`🎁 자원 선택 상자 표시 함수 호출: 레벨 ${level}, 수량 ${amount}`);
        const resourceTypes = ['water', 'brick', 'plant', 'wood']; // brick으로 수정
        window.currentResourceNames = {
            'water': '물',
            'brick': '벽돌',
            'plant': '식물',
            'wood': '나무'
        };
        // 모달 요소 생성
        const modal = document.createElement('div');
        modal.className = 'resource-selection-modal';
        modal.innerHTML = `
            <div class="resource-selection-content">
                <h3>🎁 ${level}단계 자원 선택 상자</h3>
                <p>원하는 자원을 선택하세요:</p>
                <div class="resource-selection-grid">
                    ${resourceTypes.map(type => {
                        const resource = new Resource(type, level);
                        resource.useImage = false; // 항상 아이콘만 사용
                        return `
                            <button class="resource-selection-item" data-type="${type}" data-level="${level}" data-amount="${amount}">
                                <div class="resource-icon">${resource.getIcon()}</div>
                                <div class="resource-name">${window.currentResourceNames[type]}(레벨${level})</div>
                                <div class="resource-amount">${amount}개</div>
                            </button>
                        `;
                    }).join('')}
                </div>
                <button class="ui-button" id="close-resource-selection">닫기</button>
            </div>
        `;
        // 버튼 이벤트 위임
        modal.addEventListener('click', (e) => {
            const btn = e.target.closest('.resource-selection-item');
            if (btn) {
                const type = btn.getAttribute('data-type');
                const level = parseInt(btn.getAttribute('data-level'));
                const amount = parseInt(btn.getAttribute('data-amount'));
                this.selectBoxResource(type, level, amount);
                modal.remove();
            }
        });
        // notification 영역에 모달 추가
        const notification = document.getElementById('notification');
        if (notification) {
            notification.appendChild(modal);
            notification.classList.remove('hidden');
        }
    }

    /**
     * 자원 선택 상자에서 자원 선택
     */
    selectBoxResource(type, level, amount) {
        for (let i = 0; i < amount; i++) {
            this.spawnSpecificResource(type, level);
        }
        
        this.hideNotification();
        this.showNotification(`🎁 ${window.currentResourceNames[type]}(레벨${level}) ${amount}개를 받았습니다!`);
        this.saveGameData();
    }

    /**
     * 특정 자원 생성
     */
    spawnSpecificResource(type, level, targetBoard = 'main') {
        const board = targetBoard === 'main' ? this.board : this.stageBoard;
        const emptyCells = [];

        // 빈 칸 찾기
        for (let y = 0; y < 5; y++) {
            for (let x = 0; x < 5; x++) {
                if (!board[y][x]) {
                    emptyCells.push({ x, y });
                }
            }
        }

        if (emptyCells.length === 0) return null;

        // 랜덤 빈 칸 선택
        const randomCell = emptyCells[Math.floor(Math.random() * emptyCells.length)];
        const resource = new Resource(type, level, randomCell.x, randomCell.y);
        board[randomCell.y][randomCell.x] = resource;

        this.renderBoard(targetBoard);
        
        // 메인 보드에 자원 생성 시 건물 목록 UI 업데이트
        if (targetBoard === 'main') {
            this.updateBuildingUI();
        }
        
        return resource;
    }

    /**
     * 서브 머지 보상 확인
     */
    checkSubMergeRewards(newResource) {
        // 서브 머지 전용 보상 시스템
        const rewards = [];
        
        // 레벨별 보상
        switch (newResource.level) {
            case 2:
                rewards.push({ type: 'coins', amount: 5 });
                break;
            case 3:
                rewards.push({ type: 'coins', amount: 10 });
                break;
            case 4:
                rewards.push({ type: 'coins', amount: 20 });
                rewards.push({ type: 'gems', amount: 1 });
                break;
        }
        
        // 보상 지급
        rewards.forEach(reward => {
            this.player.addCurrency(reward.type, reward.amount);
        });
        
        // 보상 알림 (서브 머지용)
        if (rewards.length > 0) {
            const rewardText = rewards.map(r => {
                const icon = r.type === 'coins' ? '💰' : r.type === 'gems' ? '💎' : '🎁';
                return `${icon} ${r.amount}`;
            }).join(', ');
            
            this.showSubMergeNotification(`🎯 서브 머지 보상: ${rewardText}`);
        }
    }

    /**
     * 서브 머지 전용 알림
     */
    showSubMergeNotification(message) {
        // 기존 알림과 구분되는 서브 머지 알림
        const notification = document.createElement('div');
        notification.className = 'sub-merge-notification';
        notification.textContent = message;
        
        document.body.appendChild(notification);
        
        // 3초 후 자동 제거
        setTimeout(() => {
            if (notification.parentNode) {
                notification.parentNode.removeChild(notification);
            }
        }, 3000);
    }

    /**
     * 장애물 생성
     */
    createTrashObstacle(type, maxHp, x, y) {
        try {
            console.log(`🔨 장애물 생성: ${type}, HP: ${maxHp}, 위치: (${x}, ${y})`);
            
            const obstacle = new TrashObstacle(type, maxHp);
            obstacle.x = x;
            obstacle.y = y;
            this.trashObstacles.push(obstacle);
            
            console.log(`✅ 장애물 생성 완료:`, obstacle);
            return obstacle;
            
        } catch (error) {
            console.error('❌ 장애물 생성 중 오류:', error);
            throw error;
        }
    }

    /**
     * 스테이지에 장애물 배치
     */
    placeTrashObstaclesInStage(stageData) {
        console.log('🗑️ 장애물 배치 함수 시작, 스테이지 데이터:', stageData);
        
        try {
            // 기존 장애물 제거
            this.trashObstacles = [];
            console.log('🧹 기존 장애물 배열 초기화 완료');
            
            if (stageData && stageData.obstacles) {
                console.log('📦 장애물 데이터 발견:', stageData.obstacles);
                
                stageData.obstacles.forEach((obstacleData, index) => {
                    console.log(`🔨 장애물 ${index + 1} 생성 중:`, obstacleData);
                    
                    const obstacle = this.createTrashObstacle(
                        obstacleData.type,
                        obstacleData.maxHp,
                        obstacleData.x,
                        obstacleData.y
                    );
                    
                    console.log(`✅ 장애물 ${index + 1} 생성 완료:`, obstacle);
                });
                
                console.log(`🎯 총 ${this.trashObstacles.length}개 장애물 배치 완료`);
            } else {
                console.log('📝 이 스테이지에는 장애물이 없습니다');
            }
            
        } catch (error) {
            console.error('❌ 장애물 배치 중 오류 발생:', error);
            throw error; // 상위로 오류 전파
        }
    }

    /**
     * 장애물 주변 셀 확인
     */
    getAdjacentCells(x, y) {
        const adjacent = [];
        const directions = [
            [-1, -1], [-1, 0], [-1, 1],
            [0, -1],           [0, 1],
            [1, -1],  [1, 0],  [1, 1]
        ];

        // 현재 스테이지 보드 크기 사용
        const boardSize = this.stageBoardSize || 5;

        directions.forEach(([dx, dy]) => {
            const newX = x + dx;
            const newY = y + dy;
            if (newX >= 0 && newX < boardSize && newY >= 0 && newY < boardSize) {
                adjacent.push({ x: newX, y: newY });
            }
        });

        return adjacent;
    }

    /**
     * 머지 위치 주변의 장애물에 대미지 적용
     */
    damageNearbyTrashObstacles(mergeX, mergeY, damage = 25) {
        const adjacentCells = this.getAdjacentCells(mergeX, mergeY);
        const destroyedObstacles = [];

        // 인접한 셀에 있는 장애물들에 대미지 적용
        this.trashObstacles.forEach(obstacle => {
            const isAdjacent = adjacentCells.some(cell => 
                cell.x === obstacle.x && cell.y === obstacle.y
            );

            if (isAdjacent) {
                // 대미지 애니메이션 효과 (더 부드럽게)
                if (obstacle.element) {
                    obstacle.element.classList.add('damage');
                    
                    // 대미지 숫자 표시 효과 추가
                    this.showDamageNumber(obstacle.element, damage);
                    
                    setTimeout(() => {
                        if (obstacle.element) {
                            obstacle.element.classList.remove('damage');
                        }
                    }, 400);
                }
                
                const isDestroyed = obstacle.takeDamage(damage);
                
                // 즉시 시각적 상태 업데이트
                obstacle.updateVisualState();
                
                if (isDestroyed) {
                    destroyedObstacles.push(obstacle);
                    // 파괴 효과
                    this.showTrashDestroyEffect(obstacle);
                }
            }
        });

        // 파괴된 장애물 제거
        destroyedObstacles.forEach(obstacle => {
            const index = this.trashObstacles.findIndex(o => o === obstacle);
            if (index !== -1) {
                this.trashObstacles.splice(index, 1);
            }
        });

        // 모든 장애물이 파괴되었는지 확인
        if (this.trashObstacles.length === 0 && this.currentStage && this.currentStage.clearCondition === 'obstacles') {
            this.completeStageByTrashDestruction();
        }

        // === 추가: 대미지 후 즉시 보드 다시 렌더링 ===
        this.renderBoard('stage');

        return destroyedObstacles.length;
    }

    /**
     * 대미지 숫자 표시 효과
     */
    showDamageNumber(element, damage) {
        const damageElement = document.createElement('div');
        damageElement.className = 'damage-number';
        damageElement.textContent = `-${damage}`;
        damageElement.style.cssText = `
            position: absolute;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            color: #FF4444;
            font-size: 1.2rem;
            font-weight: bold;
            text-shadow: 2px 2px 4px rgba(0,0,0,0.8);
            z-index: 1000;
            pointer-events: none;
            animation: damageFloat 1s ease-out forwards;
        `;
        
        element.appendChild(damageElement);
        
        // 애니메이션 완료 후 요소 제거
        setTimeout(() => {
            if (damageElement.parentNode) {
                damageElement.parentNode.removeChild(damageElement);
            }
        }, 1000);
    }

    /**
     * 장애물 파괴 효과
     */
    showTrashDestroyEffect(obstacle) {
        if (obstacle.element) {
            obstacle.element.style.animation = 'trashDestroy 0.5s ease-out';
            
            setTimeout(() => {
                if (obstacle.element && obstacle.element.parentNode) {
                    obstacle.element.parentNode.removeChild(obstacle.element);
                }
            }, 500);
        }

        // 파괴 보상 지급
        const effect = obstacle.getDestroyEffect();
        if (effect.coins) {
            this.player.addCurrency('coins', effect.coins);
        }
        if (effect.gems) {
            this.player.addCurrency('gems', effect.gems);
        }

        // 파괴 알림
        this.showSubMergeNotification(effect.message);
    }

    /**
     * 장애물 파괴로 인한 스테이지 클리어
     */
    completeStageByTrashDestruction() {
        this.showSubMergeNotification('🎉 모든 쓰레기 정리 완료! 스테이지 클리어!');
        
        // 잠시 후 스테이지 완료 처리
        setTimeout(() => {
            this.completeStage();
        }, 1000);
    }

    /**
     * 게임 데이터 저장
     */
    saveGameData() {
        // Player 객체 복사 및 Set을 Array로 변환
        const playerData = { ...this.player };
        if (this.player.rewardedLevels) {
            playerData.rewardedLevels = Array.from(this.player.rewardedLevels);
        }
        if (this.player.completedChapters) {
            playerData.completedChapters = Array.from(this.player.completedChapters);
        }
        
        const saveData = {
            player: playerData,
            board: this.saveBoardData('main'),
            stageBoard: this.saveBoardData('stage'),
            quests: this.saveQuestData(),
            mergeHistory: this.mergeHistory,
            spawnSystemData: {
                currentSpawnCount: this.currentSpawnCount,
                maxSpawnCount: this.maxSpawnCount,
                isSpawnCooldown: this.isSpawnCooldown,
                lastSpawnTime: this.lastSpawnTime
            },
            gameSystemData: {
                selectedStage: this.selectedStage,
                isMusicEnabled: this.isMusicEnabled
            },
            timestamp: Date.now()
        };
        localStorage.setItem('floraGame', JSON.stringify(saveData));
    }

    /**
     * 보드 데이터 저장을 위한 직렬화
     */
    saveBoardData(boardType) {
        const board = boardType === 'main' ? this.board : this.stageBoard;
        const boardData = [];
        
        for (let y = 0; y < 5; y++) {
            boardData[y] = [];
            for (let x = 0; x < 5; x++) {
                const resource = board[y][x];
                if (resource) {
                    boardData[y][x] = {
                        type: resource.type,
                        level: resource.level,
                        x: resource.x,
                        y: resource.y
                    };
                } else {
                    boardData[y][x] = null;
                }
            }
        }
        return boardData;
    }

    /**
     * 보드 데이터 로드 및 복원
     */
    loadBoardData(boardData, boardType) {
        const board = boardType === 'main' ? this.board : this.stageBoard;
        
        // 기존 보드 초기화
        for (let y = 0; y < 5; y++) {
            for (let x = 0; x < 5; x++) {
                board[y][x] = null;
            }
        }
        
        // 저장된 데이터로 복원
        for (let y = 0; y < 5; y++) {
            if (boardData[y]) {
                for (let x = 0; x < 5; x++) {
                    const resourceData = boardData[y][x];
                    if (resourceData) {
                        const resource = new Resource(
                            resourceData.type, 
                            resourceData.level, 
                            resourceData.x, 
                            resourceData.y
                        );
                        board[y][x] = resource;
                    }
                }
            }
        }
    }

    /**
     * 퀘스트 데이터 저장
     */
    saveQuestData() {
        return this.quests.map(quest => ({
            id: quest.id,
            title: quest.title,
            description: quest.description,
            objectives: quest.objectives,
            rewards: quest.rewards,
            progress: quest.progress,
            completed: quest.completed,
            completedTime: quest.completedTime
        }));
    }

    /**
     * 퀘스트 데이터 로드
     */
    loadQuestData(questData) {
        // 기존 퀘스트 목록 초기화
        this.quests = [];
        
        if (!questData || questData.length === 0) {
            console.log('저장된 퀘스트 데이터가 없습니다. 초기 퀘스트를 생성합니다.');
            this.quests = this.initializeQuests();
            return;
        }
        
        questData.forEach(savedQuest => {
            try {
                // 새로운 Quest 객체 생성
                const quest = new Quest(
                    savedQuest.id,
                    savedQuest.title,
                    savedQuest.description,
                    savedQuest.objectives,
                    savedQuest.rewards
                );
                quest.progress = savedQuest.progress || {};
                quest.completed = savedQuest.completed || false;
                quest.completedTime = savedQuest.completedTime;
                
                this.quests.push(quest);
            } catch (e) {
                console.warn('퀘스트 로드 중 오류:', e, savedQuest);
            }
        });
        
        // 퀘스트가 하나도 없으면 초기 퀘스트 생성
        if (this.quests.length === 0) {
            console.log('로드된 퀘스트가 없습니다. 초기 퀘스트를 생성합니다.');
            this.quests = this.initializeQuests();
        }
    }

    /**
     * 화면 전환 함수들
     */
    showLoadingScreen() {
        document.getElementById('loading-screen').classList.remove('hidden');
    }

    hideLoadingScreen() {
        document.getElementById('loading-screen').classList.add('hidden');
    }

    showMainScreen() {
        console.log('🏠 메인 화면으로 전환');
        this.gameState = 'main';
        document.getElementById('main-screen').classList.remove('hidden');
        document.getElementById('stage-screen').classList.add('hidden');
        document.getElementById('shop-screen').classList.add('hidden');
        this.renderBoard('main');
        this.updateSurroundingBuildings(); // 주변 건물 업데이트
        this.updateUI(); // 전체 UI 업데이트 (스테이지 목록 포함)
        this.saveGameData(); // 메인 화면으로 돌아갈 때 저장
        
        // 메인 화면에서 스테이지 음악 정지하고, 음악이 활성화되어 있을 때만 배경음악 재생
        this.stopStageMusic();
        if (this.isMusicEnabled) {
            // 이미 재생 중이 아닐 때만 재생
            const bgMusic = document.getElementById('background-music');
            if (bgMusic && bgMusic.paused) {
                this.playBackgroundMusic();
            }
        }
        
        console.log('✅ 메인 화면 전환 완료');
    }

    showStageScreen() {
        console.log('🎮 스테이지 화면 표시 시작');
        
        // 게임 상태 변경
        this.gameState = 'stage';
        
        // 모든 화면 숨기기
        document.getElementById('main-screen').classList.add('hidden');
        document.getElementById('shop-screen').classList.add('hidden');
        
        // 스테이지 화면 표시
        const stageScreen = document.getElementById('stage-screen');
        if (stageScreen) {
            stageScreen.classList.remove('hidden');
            console.log('📺 스테이지 화면 DOM 요소 표시됨');
        } else {
            console.error('❌ stage-screen DOM 요소를 찾을 수 없습니다!');
            this.showNotification('스테이지 화면을 표시할 수 없습니다!');
            return;
        }
        
        // 스테이지 화면에서는 메인 배경음악 정지하고, 음악이 활성화되어 있을 때만 스테이지 음악 재생
        this.stopBackgroundMusic();
        if (this.isMusicEnabled) {
            // 이미 재생 중이 아닐 때만 재생
            const stageMusic = document.getElementById('stage-music');
            if (stageMusic && stageMusic.paused) {
                this.playStageMusic();
            }
        }
        
        // 스테이지 보드 렌더링
        this.renderBoard('stage');
        
        // 스테이지 UI 업데이트
        this.updateStageUI();
        
        console.log('✅ 스테이지 화면 표시 완료');
    }

    showShopScreen() {
        this.gameState = 'shop';
        document.getElementById('main-screen').classList.add('hidden');
        document.getElementById('shop-screen').classList.remove('hidden');
        
        // 상점 화면에서는 모든 음악 정지
        this.stopBackgroundMusic();
        this.stopStageMusic();
        
        this.updateShopUI();
    }

    /**
     * DOM 요소 존재 확인
     */
    checkDOMElements() {
        const requiredElements = [
            'notification',
            'notification-text', 
            'close-notification',
            'main-screen',
            'stage-screen',
            'shop-screen',
            'sell-mode',
            'spawn-resource',
            'merge-board'
        ];
        
        const missingElements = [];
        
        requiredElements.forEach(id => {
            const element = document.getElementById(id);
            if (!element) {
                missingElements.push(id);
                console.error(`❌ DOM 요소 누락: ${id}`);
            } else {
                console.log(`✅ DOM 요소 확인: ${id}`, element);
            }
        });
        
        if (missingElements.length > 0) {
            console.error('❌ 누락된 DOM 요소들:', missingElements);
            return false;
        }
        
        console.log('✅ 모든 필수 DOM 요소가 존재합니다');
        return true;
    }

    /**
     * 이벤트 리스너 초기화 (중복 방지)
     */
    initializeEventListeners() {
        // 기존 이벤트 리스너 제거 (중복 방지)
        this.removeEventListeners();
        
        // 화면 전환 버튼들
        document.getElementById('stage-btn').addEventListener('click', () => this.startStage());
        document.getElementById('shop-btn').addEventListener('click', () => this.showShopScreen());
        document.getElementById('back-to-main').addEventListener('click', () => this.showMainScreen());
        document.getElementById('close-shop').addEventListener('click', () => this.showMainScreen());

        // 스테이지 관련 버튼들
        document.getElementById('stage-complete').addEventListener('click', () => this.completeStage());
        document.getElementById('stage-reset').addEventListener('click', () => this.resetStage());

        // 보드 액션 버튼들
        const sellModeButton = document.getElementById('sell-mode');
        if (sellModeButton) {
            console.log('🔍 판매 모드 버튼 발견:', sellModeButton);
            
            // 새로운 이벤트 리스너 추가
            sellModeButton.addEventListener('click', (e) => {
                console.log('🖱️ 판매 모드 버튼 클릭됨!', e);
                console.log('🖱️ 클릭 이벤트 상세:', {
                    target: e.target,
                    currentTarget: e.currentTarget,
                    type: e.type,
                    bubbles: e.bubbles,
                    cancelable: e.cancelable
                });
                
                // 현재 판매 모드 상태에 따라 다른 동작 수행
                if (this.sellMode) {
                    // 판매 모드가 활성화되어 있으면 비활성화
                    console.log('🔄 판매 모드 비활성화 요청');
                    this.deactivateSellMode();
                } else {
                    // 판매 모드가 비활성화되어 있으면 활성화
                    console.log('🔄 판매 모드 활성화 요청');
                    this.toggleSellMode();
                }
            });
            
            // 추가 디버깅: 버튼이 실제로 클릭 가능한지 확인
            sellModeButton.addEventListener('mousedown', (e) => {
                console.log('🖱️ 판매 모드 버튼 마우스 다운:', e);
            });
            
            sellModeButton.addEventListener('mouseup', (e) => {
                console.log('🖱️ 판매 모드 버튼 마우스 업:', e);
            });
            
            console.log('✅ 판매 모드 버튼 이벤트 리스너 설정 완료');
        } else {
            console.error('❌ 판매 모드 버튼을 찾을 수 없습니다!');
        }
        
        document.getElementById('spawn-resource').addEventListener('click', () => this.spawnNewResource());

        // 알림 닫기
        document.getElementById('close-notification').addEventListener('click', () => this.hideNotification());

        // 게임 초기화 관련 버튼들
        document.getElementById('reset-game-btn').addEventListener('click', () => this.showResetConfirmation());
        document.getElementById('confirm-reset').addEventListener('click', () => this.confirmGameReset());
        document.getElementById('cancel-reset').addEventListener('click', () => this.hideResetConfirmation());

        // 설정 버튼 (음악 제어)
        document.getElementById('settings-btn').addEventListener('click', () => this.toggleBackgroundMusic());

        // 상점 탭들
        document.querySelectorAll('.shop-tab').forEach(tab => {
            tab.addEventListener('click', (e) => this.switchShopTab(e.target.dataset.tab));
        });

        // 키보드 이벤트
        document.addEventListener('keydown', (e) => this.handleKeydown(e));
        
        console.log('✅ 이벤트 리스너 초기화 완료');

        // 자동 머지 UI 갱신 함수
        this.updateAutoMergeUI();

        // 게임 초기화 시 자동 머지 버튼 이벤트 등록
        const autoMergeBtn = document.getElementById('auto-merge-btn');
        if (autoMergeBtn) {
            autoMergeBtn.addEventListener('click', () => {
                if (this.player.getAutoMergeCount() > 0) {
                    if (this.player.useAutoMerge()) {
                        this.showNotification('🔄 자동 머지 발동!\n보드 전체가 자동 합성됩니다.');
                        this.executeAutoMergeAll();
                        this.saveGameData();
                    }
                } else {
                    this.showNotification('자동 머지 아이템이 없습니다!');
                }
            });
        }
    }

    /**
     * 기존 이벤트 리스너 제거 (중복 방지)
     */
    removeEventListeners() {
        // 모든 버튼의 이벤트 리스너 제거
        const buttons = document.querySelectorAll('button');
        buttons.forEach(button => {
            // 클론된 버튼으로 이벤트 리스너 제거
            const newButton = button.cloneNode(true);
            button.parentNode.replaceChild(newButton, button);
        });
        
        // 키보드 이벤트 리스너 제거
        document.removeEventListener('keydown', this.handleKeydown);
        
        console.log('🧹 기존 이벤트 리스너 제거 완료');
    }

    /**
     * 키보드 이벤트 처리
     */
    handleKeydown(e) {
        if (e.key === 'Escape') {
            // 초기화 확인 팝업이 열려있으면 닫기
            const resetConfirmation = document.getElementById('reset-confirmation');
            if (!resetConfirmation.classList.contains('hidden')) {
                this.hideResetConfirmation();
                return;
            }
            
            if (this.gameState !== 'main') {
                this.showMainScreen();
            } else if (this.sellMode) {
                this.deactivateSellMode(); // 판매 모드 해제
            }
        }
        if (e.key === ' ') {
            e.preventDefault();
            this.spawnNewResource(); // 스페이스바로 새 자원 생성
        }
    }

    /**
     * 보드 렌더링
     */
    renderBoard(boardType = 'main') {
        const board = boardType === 'main' ? this.board : this.stageBoard;
        const boardElement = document.getElementById(boardType === 'main' ? 'merge-board' : 'stage-board');
        
        // 보드 초기화
        boardElement.innerHTML = '';
        
        // 보드 크기 결정
        const boardSize = boardType === 'main' ? 5 : this.stageBoardSize;
        console.log(`🎨 ${boardType} 보드 렌더링: ${boardSize}x${boardSize}`);
        console.log(`📋 ${boardType} 보드 배열 크기: ${board.length}x${board[0]?.length}`);
        if (boardType === 'main') {
            console.log(`💰 판매 모드 상태: ${this.sellMode ? '활성화' : '비활성화'}`);
        }
        
        // CSS 그리드 스타일 동적 설정 (스테이지 보드만)
        if (boardType === 'stage') {
            boardElement.style.setProperty('grid-template-columns', `repeat(${boardSize}, 60px)`, 'important');
            boardElement.style.setProperty('grid-template-rows', `repeat(${boardSize}, 60px)`, 'important');
            console.log(`📐 스테이지 보드 CSS 그리드 설정: ${boardSize}x${boardSize}`);
        }
        
        // 동적 그리드 생성
        let cellCount = 0;
        for (let y = 0; y < boardSize; y++) {
            for (let x = 0; x < boardSize; x++) {
                const cell = document.createElement('div');
                let cellClassName = 'board-cell';
                cellCount++;
                
                // 판매 모드일 때 빈 셀 하이라이트
                if (this.sellMode && boardType === 'main' && !board[y][x]) {
                    cellClassName += ' sell-highlight';
                }
                
                cell.className = cellClassName;
                cell.dataset.x = x;
                cell.dataset.y = y;
                cell.dataset.board = boardType;

                // 자원이 있는 경우 (배열 경계 체크 추가)
                const resource = board[y] && board[y][x];
                if (resource) {
                    const resourceElement = document.createElement('div');
                    let className = `resource-item resource-${resource.type} level-${resource.level}`;
                    
                    // 판매 모드일 때 시각적 효과 추가
                    if (this.sellMode && boardType === 'main') {
                        className += ' sell-mode';
                        console.log(`🎨 판매 모드 시각적 효과 적용: ${resource.getName()} at (${x}, ${y})`);
                    }
                    
                    resourceElement.className = className;
                    resourceElement.textContent = resource.getIcon();
                    
                    // 판매 모드일 때 가격 정보 추가
                    let title = `${resource.getName()} (레벨 ${resource.level})`;
                    if (this.sellMode && boardType === 'main') {
                        const sellPrice = this.calculateSellPrice(resource);
                        title += ` - 판매가: ${sellPrice} 코인`;
                    }
                    resourceElement.title = title;
                    
                    resourceElement.draggable = !this.sellMode; // 판매 모드에서는 드래그 비활성화
                    
                    resource.element = resourceElement;
                    
                    // 이벤트 리스너를 한 번만 등록하기 위해 이벤트 위임 사용
                    // 클릭 이벤트는 셀 레벨에서 처리
                    
                    cell.appendChild(resourceElement);
                 }

                 // 서브 머지에서 쓰레기 장애물 렌더링
                 if (boardType === 'stage') {
                     try {
                         const obstacle = this.trashObstacles.find(obs => obs.x === x && obs.y === y);
                         if (obstacle && !resource) { // 자원이 없는 칸에만 장애물 표시
                             console.log(`🎨 장애물 렌더링: ${obstacle.type} at (${x}, ${y})`);
                             
                             const obstacleElement = document.createElement('div');
                             obstacleElement.className = 'trash-obstacle';
                             obstacleElement.setAttribute('data-type', obstacle.type);
                             
                             // HP 정보를 동적으로 계산하여 정확한 값 표시
                             const hpPercentage = (obstacle.currentHp / obstacle.maxHp) * 100;
                             const hpColor = hpPercentage > 66 ? '#27AE60' : 
                                           hpPercentage > 33 ? '#F39C12' : '#E74C3C';
                             
                             obstacleElement.innerHTML = `
                                 <div class="trash-icon">${obstacle.getIcon()}</div>
                                 <div class="trash-hp-bar">
                                     <div class="hp-fill" style="width: ${hpPercentage}%; background-color: ${hpColor};"></div>
                                 </div>
                                 <div class="trash-hp-text" style="color: ${hpPercentage <= 33 ? '#FF6B6B' : hpPercentage <= 66 ? '#FFA500' : 'white'};">${obstacle.currentHp}/${obstacle.maxHp}</div>
                             `;
                             
                             cell.appendChild(obstacleElement);
                             obstacle.element = obstacleElement;
                             
                             // 시각적 상태 즉시 업데이트
                             obstacle.updateVisualState();
                             
                             console.log(`✅ 장애물 렌더링 완료: ${obstacle.type}, HP: ${obstacle.currentHp}/${obstacle.maxHp}`);
                         }
                     } catch (error) {
                         console.error(`❌ 장애물 렌더링 오류 at (${x}, ${y}):`, error);
                     }
                 }

                boardElement.appendChild(cell);
            }
        }
        
        // 보드 전체에 이벤트 위임으로 이벤트 리스너 등록 (한 번만)
        this.setupBoardEventListeners(boardElement, boardType);
        
        console.log(`✅ ${boardType} 보드 렌더링 완료: ${cellCount}개 셀 생성 (예상: ${boardSize * boardSize}개)`);
    }

    /**
     * 보드 이벤트 리스너 설정 (이벤트 위임 방식)
     */
    setupBoardEventListeners(boardElement, boardType) {
        // 기존 이벤트 리스너 제거
        const newBoardElement = boardElement.cloneNode(true);
        boardElement.parentNode.replaceChild(newBoardElement, boardElement);
        
        // 이벤트 위임으로 보드 전체에 이벤트 리스너 등록
        newBoardElement.addEventListener('click', (e) => {
            const cell = e.target.closest('.board-cell');
            if (!cell) return;
            
            const x = parseInt(cell.dataset.x);
            const y = parseInt(cell.dataset.y);
            const resource = e.target.closest('.resource-item');
            
            if (resource) {
                // 자원 클릭 처리
                const resourceData = this.getResourceFromElement(resource, boardType);
                if (resourceData) {
                    this.handleResourceClick(e, resourceData, x, y, boardType);
                }
            } else {
                // 빈 셀 클릭 처리
                this.handleCellClick(e, x, y, boardType);
            }
        });
        
        // 드래그 이벤트 위임
        newBoardElement.addEventListener('dragstart', (e) => {
            const resource = e.target.closest('.resource-item');
            if (resource) {
                const resourceData = this.getResourceFromElement(resource, boardType);
                if (resourceData) {
                    this.handleDragStart(e, resourceData, boardType);
                }
            }
        });
        
        newBoardElement.addEventListener('dragend', (e) => {
            this.handleDragEnd(e);
        });
        
        newBoardElement.addEventListener('dragover', (e) => {
            const cell = e.target.closest('.board-cell');
            if (cell) {
                this.handleDragOver(e);
            }
        });
        
        newBoardElement.addEventListener('drop', (e) => {
            const cell = e.target.closest('.board-cell');
            if (cell) {
                const x = parseInt(cell.dataset.x);
                const y = parseInt(cell.dataset.y);
                this.handleDrop(e, x, y, boardType);
            }
        });
    }

    /**
     * DOM 요소에서 자원 데이터 추출
     */
    getResourceFromElement(element, boardType) {
        const board = boardType === 'main' ? this.board : this.stageBoard;
        const cell = element.closest('.board-cell');
        if (!cell) return null;
        
        const x = parseInt(cell.dataset.x);
        const y = parseInt(cell.dataset.y);
        
        return board[y] && board[y][x];
    }

    /**
     * 드래그 시작 처리
     */
    handleDragStart(e, resource, boardType) {
        this.draggedResource = { resource, boardType, originalX: resource.x, originalY: resource.y };
        e.dataTransfer.effectAllowed = 'move';
        e.target.classList.add('dragging');
    }

    /**
     * 드래그 종료 처리
     */
    handleDragEnd(e) {
        e.target.classList.remove('dragging');
        this.clearDropHighlights();
    }

    /**
     * 드래그 오버 처리
     */
    handleDragOver(e) {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
        
        if (this.draggedResource) {
            const cell = e.target.closest('.board-cell');
            if (!cell) return;
            
            const x = parseInt(cell.dataset.x);
            const y = parseInt(cell.dataset.y);
            const boardType = cell.dataset.board;
            
            if (this.canPlaceResource(x, y, boardType)) {
                cell.classList.add('valid-drop');
            } else {
                cell.classList.add('invalid-drop');
            }
        }
    }

    /**
     * 드롭 처리
     */
    handleDrop(e, x, y, boardType) {
        e.preventDefault();
        this.clearDropHighlights();

        if (!this.draggedResource || this.draggedResource.boardType !== boardType) {
            return;
        }

        if (this.canPlaceResource(x, y, boardType)) {
            this.moveResource(this.draggedResource.resource, x, y, boardType);
        }

        this.draggedResource = null;
    }

    /**
     * 자원 클릭 처리 (더블클릭 방식 + 판매 모드)
     */
    handleResourceClick(e, resource, x, y, boardType) {
        console.log(`🖱️ 자원 클릭: ${resource.getName()} at (${x}, ${y}) on ${boardType} board, sellMode: ${this.sellMode}`);
        
        // 판매 모드일 때는 자원 판매
        if (this.sellMode && boardType === 'main') {
            console.log(`💰 판매 모드에서 자원 판매 시도: ${resource.getName()}`);
            this.sellResource(resource, x, y);
            return;
        }
        
        if (this.selectedCell && 
            this.selectedCell.x === x && 
            this.selectedCell.y === y && 
            this.selectedCell.boardType === boardType) {
            // 같은 자원 다시 클릭 - 선택 해제
            this.clearSelection();
        } else {
            // 새로운 자원 선택
            this.selectResource(resource, x, y, boardType);
        }
    }

    /**
     * 셀 클릭 처리
     */
    handleCellClick(e, x, y, boardType) {
        // 자원이 클릭된 경우는 handleResourceClick에서 처리됨
        if (this.selectedCell) {
            // 선택된 자원이 있고 빈 셀을 클릭한 경우
            if (this.canPlaceResource(x, y, boardType)) {
                this.moveResource(this.selectedCell.resource, x, y, boardType);
                this.clearSelection();
            }
        }
    }

    /**
     * 자원 선택
     */
    selectResource(resource, x, y, boardType) {
        this.clearSelection();
        this.selectedCell = { resource, x, y, boardType };
        
        // 시각적 피드백
        const board = boardType === 'main' ? this.board : this.stageBoard;
        if (board[y][x] && board[y][x].element) {
            board[y][x].element.parentElement.classList.add('selected');
        }
    }

    /**
     * 선택 해제
     */
    clearSelection() {
        if (this.selectedCell) {
            const board = this.selectedCell.boardType === 'main' ? this.board : this.stageBoard;
            const resource = board[this.selectedCell.y][this.selectedCell.x];
            if (resource && resource.element) {
                resource.element.parentElement.classList.remove('selected');
            }
        }
        this.selectedCell = null;
    }

    /**
     * 드롭 하이라이트 제거
     */
    clearDropHighlights() {
        document.querySelectorAll('.board-cell').forEach(cell => {
            cell.classList.remove('valid-drop', 'invalid-drop');
        });
    }

    /**
     * 자원 배치 가능 여부 확인
     */
    canPlaceResource(x, y, boardType) {
        const board = boardType === 'main' ? this.board : this.stageBoard;
        
        // 이미 자원이 있는지 확인
        if (board[y][x]) {
            return false;
        }
        
        // 서브 머지에서는 쓰레기 장애물이 있는 칸에도 배치 불가
        if (boardType === 'stage') {
            const hasObstacle = this.trashObstacles.some(obstacle => 
                obstacle.x === x && obstacle.y === y
            );
            if (hasObstacle) {
                return false;
            }
        }
        
        return true;
    }

    /**
     * 자원 이동
     */
    moveResource(resource, newX, newY, boardType) {
        const board = boardType === 'main' ? this.board : this.stageBoard;
        
        // 이전 위치에서 제거
        if (resource.x >= 0 && resource.y >= 0) {
            board[resource.y][resource.x] = null;
        }
        
        // 새 위치에 배치
        resource.x = newX;
        resource.y = newY;
        board[newY][newX] = resource;
        
        // 보드 다시 렌더링
        this.renderBoard(boardType);
        
        // 머지 확인 (드래그한 자원 위치를 우선 검사)
        // 서브 머지(스테이지)에서는 자동 머지 비활성화
        const autoMergeEnabled = boardType === 'main' ? this.player.hasAutoMerge : false;
        console.log(`🔄 ${boardType} 보드에서 머지 확인 시작: autoMerge=${autoMergeEnabled}, position=(${newX}, ${newY})`);
        this.checkForMerges(boardType, autoMergeEnabled, { x: newX, y: newY });
        
        // 메인 보드 상태 저장
        if (boardType === 'main') {
            this.saveGameData();
        }
    }

    /**
     * 머지 확인 및 실행
     * 1~3레벨 자원: 정상 합성 가능 (4레벨 자원이 있어도 영향받지 않음)
     * 4레벨 자원: 더 이상 합성되지 않음 (최고 레벨)
     * 
     * 머지 동작 규칙:
     * - 자동 머지 아이템 없음 + 드래그: 드래그한 자원만 머지
     * - 자동 머지 아이템 있음 + 드래그: 드래그한 자원부터 연쇄 머지
     * - 우선 위치 없음: 전체 보드 순차 검사 (자원 생성 등)
     * 
     * @param {string} boardType - 보드 타입 ('main' 또는 'stage')
     * @param {boolean} autoMergeAll - 자동으로 모든 머지 가능한 자원을 머지할지 여부
     * @param {Object} priorityPosition - 우선적으로 검사할 위치 {x, y} (드래그한 자원 위치)
     */
    checkForMerges(boardType, autoMergeAll = false, priorityPosition = null) {
        const board = boardType === 'main' ? this.board : this.stageBoard;
        const boardSize = boardType === 'main' ? 5 : this.stageBoardSize;
        let mergeFound = false;

        console.log(`🔍 ${boardType} 보드 머지 체크 시작: boardSize=${boardSize}, priorityPos=${priorityPosition ? `(${priorityPosition.x}, ${priorityPosition.y})` : 'none'}`);

        // 우선 검사할 위치가 있다면 먼저 확인
        if (priorityPosition) {
            const { x: px, y: py } = priorityPosition;
            const priorityResource = board[py] && board[py][px];
            console.log(`🎯 우선 위치 (${px}, ${py}) 자원 확인:`, priorityResource ? `${priorityResource.type} Lv.${priorityResource.level}` : 'null');
            
            if (priorityResource && priorityResource.level <= 3) {
                const mergePair = this.findMergePairFlexible(board, px, py, priorityResource.type, priorityResource.level, boardSize);
                console.log(`🔍 우선 자원 머지 쌍 검색 결과: ${mergePair.length}개 쌍 발견`);
                
                if (mergePair.length === 2) {
                    console.log(`✅ 우선 자원 머지 실행: ${priorityResource.type} Lv.${priorityResource.level}`);
                    // 우선 자원이 머지됨
                    this.executeMerge(mergePair, boardType);
                    mergeFound = true;
                    
                    // 자동 머지 아이템이 있을 때만 연쇄 머지 확인
                    if (autoMergeAll && this.player.hasAutoMerge) {
                        setTimeout(() => this.checkForMerges(boardType, true), 600);
                    }
                    return; // 우선 자원이 머지되면 종료
                }
            }
        }

        // 자동 머지 아이템이 없고 우선 위치가 지정된 경우(드래그 머지)에는 다른 자원들을 검사하지 않음
        if (priorityPosition && !this.player.hasAutoMerge) {
            return; // 드래그한 자원만 검사하고 종료
        }

        // 레벨 순서대로 확인 (1레벨부터 3레벨까지, 4레벨은 제외)
        // 이 부분은 자동 머지 아이템이 있거나 우선 위치가 없을 때만 실행됨
        for (let level = 1; level <= 3; level++) {
            for (let y = 0; y < boardSize; y++) {
                for (let x = 0; x < boardSize; x++) {
                    const resource = board[y][x];
                    if (!resource || resource.level !== level) continue;

                    // 우선 검사한 위치는 건너뛰기
                    if (priorityPosition && x === priorityPosition.x && y === priorityPosition.y) {
                        continue;
                    }

                    // 인접한 같은 타입/레벨 자원 찾기
                    const mergePair = this.findMergePair(board, x, y, resource.type, resource.level, boardSize);
                    if (mergePair.length === 2) {
                        // 머지 실행
                        this.executeMerge(mergePair, boardType);
                        mergeFound = true;
                        
                        // 자동 머지 아이템이 있을 때만 연쇄 머지 확인
                        if (autoMergeAll && this.player.hasAutoMerge) {
                            setTimeout(() => this.checkForMerges(boardType, true), 600);
                        }
                        return; // 한 번에 하나씩만 머지
                    }
                }
            }
        }

        // 4레벨 자원은 합성되지 않으므로 체크하지 않음
        // 하지만 혹시나 해서 4레벨도 확인 (실제로는 executeMerge에서 차단됨)
        if (!mergeFound) {
            for (let y = 0; y < boardSize; y++) {
                for (let x = 0; x < boardSize; x++) {
                    const resource = board[y][x];
                    if (!resource || resource.level !== 4) continue;

                    // 4레벨 자원 쌍 찾기 (하지만 executeMerge에서 차단됨)
                    const mergePair = this.findMergePair(board, x, y, resource.type, resource.level, boardSize);
                    if (mergePair.length === 2) {
                        // 4레벨 자원은 executeMerge에서 차단되어 실제로는 합성되지 않음
                        this.executeMerge(mergePair, boardType);
                        return;
                    }
                }
            }
        }
    }

    /**
     * 머지할 2개 자원 쌍 찾기 (유연한 버전)
     * 드래그된 자원에서는 모든 방향을 검사하여 머지 가능한 자원을 찾음
     */
    findMergePairFlexible(board, x, y, type, level, boardSize = 5) {
        const currentResource = board[y][x];
        if (!currentResource || currentResource.type !== type || currentResource.level !== level) {
            console.log(`❌ findMergePairFlexible 실패: (${x}, ${y})에 유효한 자원 없음`);
            return [];
        }
        
        console.log(`🔍 findMergePairFlexible: (${x}, ${y})에서 ${type} Lv.${level} 검색, boardSize=${boardSize}`);

        // 8방향 확인하여 인접한 같은 자원 찾기 (좌표 제한 없음)
        // 가로/세로를 먼저 확인하고 대각선은 나중에 확인 (직관적인 머지를 위해)
        const directions = [
            [0, -1],  // 위
            [0, 1],   // 아래
            [-1, 0],  // 왼쪽
            [1, 0],   // 오른쪽
            [-1, -1], // 왼쪽 위 대각선
            [-1, 1],  // 왼쪽 아래 대각선
            [1, -1],  // 오른쪽 위 대각선
            [1, 1]    // 오른쪽 아래 대각선
        ];

        for (const [dx, dy] of directions) {
            const newX = x + dx;
            const newY = y + dy;
            
            if (newX >= 0 && newX < boardSize && newY >= 0 && newY < boardSize) {
                const adjacentResource = board[newY][newX];
                console.log(`🔍 인접 셀 (${newX}, ${newY}) 확인:`, adjacentResource ? `${adjacentResource.type} Lv.${adjacentResource.level}` : 'null');
                
                if (adjacentResource && 
                    adjacentResource.type === type && 
                    adjacentResource.level === level) {
                    
                    console.log(`✅ 머지 쌍 발견: (${x}, ${y}) + (${newX}, ${newY})`);
                    // 좌표 제한 없이 첫 번째로 발견된 인접 자원과 쌍 생성
                    return [
                        { x, y, resource: currentResource },
                        { x: newX, y: newY, resource: adjacentResource }
                    ];
                }
            } else {
                console.log(`❌ 인접 셀 (${newX}, ${newY}) 보드 범위 벗어남 (0~${boardSize-1})`);
            }
        }

        console.log(`❌ 머지 쌍 없음: (${x}, ${y})에서 ${type} Lv.${level}`);
        return [];
    }

    /**
     * 머지할 2개 자원 쌍 찾기
     * 중복 검사를 피하기 위해 더 작은 좌표의 자원만 확인
     */
    findMergePair(board, x, y, type, level, boardSize = 5) {
        const currentResource = board[y][x];
        if (!currentResource || currentResource.type !== type || currentResource.level !== level) {
            return [];
        }

        // 8방향 확인하여 인접한 같은 자원 찾기
        // 하지만 중복을 방지하기 위해 더 큰 좌표의 자원만 찾기
        const directions = [
            [-1, -1], [-1, 0], [-1, 1],
            [0, -1],           [0, 1],
            [1, -1],  [1, 0],  [1, 1]
        ];

        for (const [dx, dy] of directions) {
            const newX = x + dx;
            const newY = y + dy;
            
            if (newX >= 0 && newX < boardSize && newY >= 0 && newY < boardSize) {
                const adjacentResource = board[newY][newX];
                if (adjacentResource && 
                    adjacentResource.type === type && 
                    adjacentResource.level === level) {
                    
                    // 좌표가 더 작은 자원만 쌍을 찾도록 하여 중복 방지
                    // (x,y)가 (newX,newY)보다 작거나 같은 경우만 쌍 생성
                    if (y < newY || (y === newY && x < newX)) {
                        return [
                            { x, y, resource: currentResource },
                            { x: newX, y: newY, resource: adjacentResource }
                        ];
                    }
                }
            }
        }

        return [];
    }

    /**
     * 연결된 자원 찾기 (재귀적) - 레거시 함수, 필요시 사용
     */
    findConnectedResources(board, x, y, type, level, visited) {
        const key = `${x},${y}`;
        if (visited.has(key)) return [];
        
        const resource = board[y] && board[y][x];
        if (!resource || resource.type !== type || resource.level !== level) {
            return [];
        }

        visited.add(key);
        const group = [{ x, y, resource }];

        // 8방향 확인
        const directions = [
            [-1, -1], [-1, 0], [-1, 1],
            [0, -1],           [0, 1],
            [1, -1],  [1, 0],  [1, 1]
        ];

        for (const [dx, dy] of directions) {
            const newX = x + dx;
            const newY = y + dy;
            if (newX >= 0 && newX < boardSize && newY >= 0 && newY < boardSize) {
                const connected = this.findConnectedResources(board, newX, newY, type, level, visited);
                group.push(...connected);
            }
        }

        return group;
    }

    /**
     * 머지 실행
     * 4레벨 자원끼리는 합성되지 않지만, 1~3레벨 자원은 자유롭게 합성 가능
     * @param {Array} group - 머지할 자원 그룹
     * @param {string} boardType - 'main' 또는 'stage'
     * @param {boolean} isAutoMerge - 자동 머지 여부(기본값 false)
     */
    executeMerge(group, boardType, isAutoMerge = false) {
        if (!group || group.length < 2) return;
        // 모든 item, item.resource가 유효한지 체크
        for (const item of group) {
            if (!item || !item.resource) return;
        }
        const board = boardType === 'main' ? this.board : this.stageBoard;
        const firstResource = group[0].resource;
        if (!firstResource || typeof firstResource.level !== 'number') return;
        // 4레벨 자원끼리는 합성할 수 없음 (최고 레벨이므로 더 이상 진화 불가)
        if (firstResource.level >= 4) {
            return;
        }
        // 애니메이션 효과
        group.forEach(item => {
            if (item.resource.element) {
                item.resource.element.classList.add('merging');
            }
        });
        setTimeout(() => {
            // 첫 번째 위치에 상위 레벨 자원 생성
            const newResource = new Resource(firstResource.type, firstResource.level + 1, group[0].x, group[0].y);
            board[group[0].y][group[0].x] = newResource;
            // 두 번째 자원 제거 (2개 머지)
            if (group.length >= 2) {
                const secondItem = group[1];
                board[secondItem.y][secondItem.x] = null;
            }
            // 보드 다시 렌더링
            this.renderBoard(boardType);
            // 메인 보드에서만 통계 업데이트
            if (boardType === 'main') {
                this.updateMergeStats(firstResource.type, newResource.level);
            }
            // 머지 후 랜덤 자원 생성 로직 제거됨
            // 메인 보드에서만 퀘스트 업데이트 (자동 머지일 때는 제외)
            if (boardType === 'main' && !isAutoMerge) {
                this.updateQuests('merge', 1);
                if (firstResource.level === 1) {
                    this.updateQuests('merge_level1', 1);
                }
                if (newResource.level >= 3) {
                    this.updateQuests('create_level3', 1);
                }
                if (newResource.level >= 4) {
                    this.updateQuests('create_level4', 1);
                }
            }
            // 스테이지 진행도 업데이트 및 서브 머지 보상
            if (boardType === 'stage') {
                this.updateStageProgress('create', newResource.type, newResource.level, 1);
                this.checkSubMergeRewards(newResource);
                // 쓰레기 장애물 대미지 적용 (머지 위치 주변의 장애물에 대미지)
                const damageAmount = newResource.level * 15; // 레벨에 따라 대미지 증가
                const destroyedCount = this.damageNearbyTrashObstacles(newResource.x, newResource.y, damageAmount);
                if (destroyedCount > 0) {
                    this.showSubMergeNotification(`⚡ ${destroyedCount}개 쓰레기에 ${damageAmount} 대미지!`);
                }
            }
            // 메인 보드 머지 후 저장
            if (boardType === 'main') {
                this.saveGameData();
            }
        }, 500);
    }

    /**
     * 머지 통계 업데이트
     */
    updateMergeStats(resourceType, newLevel) {
        this.mergeHistory.push({
            resourceType,
            newLevel,
            timestamp: Date.now()
        });

        // 최근 100개만 유지
        if (this.mergeHistory.length > 100) {
            this.mergeHistory = this.mergeHistory.slice(-100);
        }
        
        // 자원 변동 후 건물 목록 UI 업데이트
        this.updateBuildingUI();
    }

    /**
     * 퀘스트 업데이트
     */
    updateQuests(type, amount = 1) {
        this.quests.forEach(quest => {
            if (!quest.completed) {
                quest.updateProgress(type, amount);
            }
        });
        this.updateQuestUI();
    }

    /**
     * 퀘스트 완료
     */
    completeQuest(quest) {
        let rewardMessages = [];
        
        quest.rewards.forEach(reward => {
            if (reward.type === 'experience') {
                this.player.addExperience(reward.amount);
                rewardMessages.push(`⭐ 경험치 ${reward.amount}`);
            } else if (reward.type === 'resource_level2') {
                // 2단계 랜덤 자원 지급
                this.giveRandomLevel2Resources(reward.amount);
                rewardMessages.push(`🎁 2단계 자원 ${reward.amount}개`);
            } else {
                this.player.addCurrency(reward.type, reward.amount);
                const icons = {
                    'coins': '💰',
                    'gems': '💎',
                    'tickets': '🎫'
                };
                rewardMessages.push(`${icons[reward.type] || '🎁'} ${reward.amount}`);
            }
        });

        this.showNotification(`퀘스트 완료: ${quest.title} | 보상: ${rewardMessages.join(', ')}`);
        this.updateUI();
    }

    /**
     * 2단계 랜덤 자원 지급
     */
    giveRandomLevel2Resources(amount) {
        const resourceTypes = ['water', 'water', 'plant', 'wood']; // sand를 water로 변경
        
        for (let i = 0; i < amount; i++) {
            // 빈 칸 찾기
            const emptyCells = [];
            for (let y = 0; y < 5; y++) {
                for (let x = 0; x < 5; x++) {
                    if (!this.board[y][x]) {
                        emptyCells.push({x, y});
                    }
                }
            }
            
            if (emptyCells.length > 0) {
                // 랜덤 위치에 랜덤 타입의 2단계 자원 생성
                const randomCell = emptyCells[Math.floor(Math.random() * emptyCells.length)];
                const randomType = resourceTypes[Math.floor(Math.random() * resourceTypes.length)];
                
                this.board[randomCell.y][randomCell.x] = new Resource(randomType, 2);
                console.log(`🎁 2단계 ${randomType} 자원을 (${randomCell.x}, ${randomCell.y})에 지급`);
            } else {
                console.warn('⚠️ 보드에 빈 공간이 없어 2단계 자원을 지급할 수 없습니다.');
                break;
            }
        }
        
        this.renderBoard('main');
        
        // 자원 변동 후 건물 목록 UI 업데이트
        this.updateBuildingUI();
    }

    /**
     * 보드 클리어 (스테이지용)
     */
    clearBoard(boardType) {
        const board = boardType === 'main' ? this.board : this.stageBoard;
        const boardSize = boardType === 'main' ? 5 : this.stageBoardSize;
        
        for (let y = 0; y < boardSize; y++) {
            for (let x = 0; x < boardSize; x++) {
                board[y][x] = null;
            }
        }
        console.log(`🧹 ${boardType} 보드 클리어 완료: ${boardSize}x${boardSize}`);
        this.renderBoard(boardType);
    }

    /**
     * 스테이지 레벨에 따른 자원 생성 최대 개수 설정
     */
    setStageMaxSpawnCount(level) {
        let maxCount;
        if (level <= 1) {
            maxCount = 8;
        } else if (level === 2) {
            maxCount = 16;
        } else if (level === 3) {
            maxCount = 24;
        } else if (level === 4) {
            maxCount = 32;
        } else {
            maxCount = 40; // 5레벨 이상
        }
        
        // 서브 머지 스테이지 모드에서만 maxSpawnCount 설정
        this.stageMaxSpawnCount = maxCount;
        console.log(`🎯 서브 머지 스테이지 레벨 ${level}에 따른 자원 생성 최대 개수 설정: ${maxCount}개`);
    }

    /**
     * 스테이지 시작
     */
    startStage() {
        console.log('🎯 스테이지 시작 함수 호출됨');
        console.log('💰 현재 티켓 수:', this.player.tickets);
        
        // 티켓이 없으면 진입 불가 (차감은 클리어 시)
        if (this.player.tickets <= 0) {
            console.log('❌ 티켓 부족으로 스테이지 시작 불가');
            console.log('📢 알림 표시: 티켓 부족');
            this.showNotification('티켓이 부족합니다! 클리어 시 티켓이 차감됩니다.');
            return false; // 명시적으로 false 반환
        }
        
        // 모든 스테이지 클리어 여부 체크 (1-5까지만 존재)
        if (this.player.currentStage.world === 1 && this.player.currentStage.level > 5) {
            console.log('🏆 챕터 1 클리어 완료');
            this.showChapterCompleteClickNotification();
            return false;
        }

        try {
            console.log('🎯 스테이지 시작 - 화면 전환 (티켓은 클리어 시 차감)');
            
            // 티켓 차감은 스테이지 클리어 시로 변경됨
            
            // 스테이지 보드 크기 설정
            this.setupStageBoardSize();
            console.log('📏 스테이지 보드 크기 설정 완료');
            
            // 스테이지 보드 초기화
            this.clearBoard('stage');
            console.log('🧹 스테이지 보드 초기화 완료');
            
            // 선택된 스테이지로 설정
            this.currentStage = this.stages.find(stage => 
                stage.world === this.selectedStage.world && stage.level === this.selectedStage.level
            );
            
            if (!this.currentStage) {
                console.error('❌ 선택된 스테이지를 찾을 수 없습니다:', this.selectedStage);
                this.showNotification('선택된 스테이지 데이터를 찾을 수 없습니다!');
                return;
            }
            
            console.log('🎮 선택된 스테이지로 진입:', this.currentStage);
            
            // 서브 머지 스테이지 레벨에 따른 자원 생성 최대 개수 설정
            this.setStageMaxSpawnCount(this.selectedStage.level);
            console.log(`🎮 서브 머지 스테이지 모드 진입: 레벨 ${this.selectedStage.level}, 자원 생성 제한: ${this.stageMaxSpawnCount}개`);
            
            // 쓰레기 장애물 배치
            console.log('🗑️ 장애물 배치 시작:', this.currentStage.obstacles);
            this.placeTrashObstaclesInStage(this.currentStage);
            console.log('🗑️ 장애물 배치 완료, 장애물 수:', this.trashObstacles.length);
            
            // 스테이지용 초기 자원 생성 (스테이지 레벨에 따라 증가)
            const resourceCount = this.getStageResourceCount();
            console.log(`💎 초기 자원 생성 시작 (${resourceCount}개)`);
            for (let i = 0; i < resourceCount; i++) {
                this.spawnRandomResource('stage');
            }
            console.log(`💎 초기 자원 생성 완료 (${resourceCount}개)`);

            // 스테이지 화면으로 전환
            console.log('🖥️ 화면 전환 시작');
            this.showStageScreen();
            console.log('🖥️ 화면 전환 완료');
            
            // 스테이지 UI 업데이트
            this.updateStageUI();
            console.log('🔄 스테이지 UI 업데이트 완료');
            
            // 스테이지 시작 상태 저장
            this.saveGameData();
            
            console.log('✅ 스테이지 화면 전환 완료');
            return true; // 성공적으로 스테이지 시작
            
        } catch (error) {
            console.error('❌ 스테이지 시작 중 오류 발생:', error);
            this.showNotification('스테이지 시작 중 오류가 발생했습니다!');
            return false; // 오류 발생
        }
    }

    /**
     * 스테이지 진행도 업데이트
     */
    updateStageProgress(type, resourceType, resourceLevel, amount) {
        const currentStage = this.getCurrentStage();
        if (currentStage) {
            currentStage.updateProgress(type, resourceType, resourceLevel, amount);
            this.updateStageUI();
            
            if (currentStage.checkCompletion()) {
                document.getElementById('stage-complete').classList.remove('disabled');
            }
        }
    }

    /**
     * 현재 스테이지 가져오기
     */
    getCurrentStage() {
        return this.stages.find(stage => 
            stage.world === this.player.currentStage.world && 
            stage.level === this.player.currentStage.level
        );
    }

    /**
     * 스테이지 완료
     */
    completeStage() {
        const currentStage = this.getCurrentStage();
        if (!currentStage || !currentStage.checkCompletion()) {
            this.showNotification('목표를 달성하지 못했습니다!');
            return;
        }
        // 스테이지 클리어 시 티켓 차감
        if (this.player.tickets <= 0) {
            console.log('❌ 티켓이 없어서 보상을 받을 수 없습니다.');
            this.showNotification('티켓이 없어서 보상을 받을 수 없습니다!');
            return;
        }
        // 티켓 차감
        this.player.spendCurrency('tickets', 1);
        console.log('💰 스테이지 클리어! 티켓 차감, 남은 티켓:', this.player.tickets);
        // 보상 지급 (경험치 제외)
        currentStage.rewards.forEach(reward => {
            if (reward.type !== 'experience') {
                this.player.addCurrency(reward.type, reward.amount);
            }
        });
        currentStage.completed = true;
        // 현재 클리어한 스테이지 정보 저장 (진행 상태 업데이트 전)
        const clearedStage = {
            world: this.player.currentStage.world,
            level: this.player.currentStage.level
        };
        // 스테이지 1-1 클리어 퀘스트 업데이트
        if (clearedStage.world === 1 && clearedStage.level === 1) {
            this.updateQuests('stage_clear_1_1', 1);
        }
        // 다음 스테이지 해금 (1-1부터 1-5까지만 존재)
        if (this.player.currentStage.world === 1 && this.player.currentStage.level < 5) {
            this.player.currentStage.level++;
            // this.selectedStage = { world: 1, level: this.player.currentStage.level }; // 중복 증가 방지 위해 삭제
            console.log(`🎯 다음 스테이지 해금: 1-${this.player.currentStage.level}`);
            console.log(`🎯 선택된 스테이지 업데이트: ${this.selectedStage.world}-${this.selectedStage.level}`);
        } else if (this.player.currentStage.world === 1 && this.player.currentStage.level === 5) {
            // 1-5를 클리어했다면 더 이상 진행할 스테이지가 없음
            this.player.currentStage.level = 6; // 모든 스테이지 클리어 상태로 설정
            console.log('🏆 모든 스테이지 클리어! 더 이상 진행할 스테이지가 없습니다.');
            this.selectedStage = { world: 1, level: 5 };
        } else if (this.player.currentStage.level < 10) {
            this.player.currentStage.level++;
        } else if (this.player.currentStage.world < 3) {
            this.player.currentStage.world++;
            this.player.currentStage.level = 1;
        }
        console.log('🎉 스테이지 클리어 처리 완료');
        // 1-5 스테이지(마지막)만 챕터 완료 알림, 그 외에는 선택 팝업
        if (clearedStage.world === 1 && clearedStage.level === 5) {
            this.showChapterCompleteNotification(1);
            // 챕터 완료 알림은 5초 후 메인화면으로 자동 전환
            setTimeout(() => {
                this.showMainScreen();
                this.saveGameData();
            }, 5000);
        } else {
            this.showStageCompleteNotification(clearedStage);
        }
    }

    /**
     * 스테이지 리셋
     */
    resetStage() {
        console.log('🔄 스테이지 리셋 시작');
        
        // 스테이지 보드 크기 재설정
        this.setupStageBoardSize();
        console.log('📏 스테이지 보드 크기 재설정 완료');
        
        // 서브 머지 스테이지 레벨에 따른 자원 생성 최대 개수 재설정
        this.setStageMaxSpawnCount(this.selectedStage.level);
        console.log(`🔄 서브 머지 스테이지 리셋: 레벨 ${this.selectedStage.level}, 자원 생성 제한: ${this.stageMaxSpawnCount}개`);
        
        // 스테이지 보드 클리어
        this.clearBoard('stage');
        
        // 장애물 상태 초기화 및 재배치
        if (this.currentStage && this.currentStage.obstacles) {
            console.log('🗑️ 장애물 상태 초기화 및 재배치 시작');
            this.placeTrashObstaclesInStage(this.currentStage);
            console.log('🗑️ 장애물 재배치 완료, 장애물 수:', this.trashObstacles.length);
        }
        
        // 새로운 자원 생성 (스테이지 레벨에 따라 증가)
        const resourceCount = this.getStageResourceCount();
        console.log(`💎 리셋 시 자원 생성: ${resourceCount}개`);
        for (let i = 0; i < resourceCount; i++) {
            this.spawnRandomResource('stage');
        }
        
        // 진행도 리셋
        const currentStage = this.getCurrentStage();
        if (currentStage) {
            currentStage.progress = {};
            console.log('📊 스테이지 진행도 리셋 완료');
        }
        
        // UI 업데이트
        this.updateStageUI();
        
        console.log('✅ 스테이지 리셋 완료');
    }

    /**
     * 판매 모드 토글
     */
    toggleSellMode() {
        console.log('🚀 toggleSellMode 함수 시작');
        console.log('📊 현재 sellMode 상태:', this.sellMode);
        
        // 이미 판매 모드가 활성화되어 있다면 아무것도 하지 않음
        if (this.sellMode) {
            console.log('⚠️ 판매 모드가 이미 활성화되어 있습니다. 버튼을 다시 클릭하면 비활성화됩니다.');
            return;
        }
        
        // 판매 모드 활성화
        this.sellMode = true;
        const sellButton = document.getElementById('sell-mode');
        
        console.log(`🔄 판매 모드 활성화`);
        console.log('🔍 sellButton 요소:', sellButton);
        
        sellButton.classList.add('sell-mode-active');
        sellButton.textContent = '❌ 판매 취소';
        this.showNotification('자원을 클릭하여 판매하세요. ESC키로 취소할 수 있습니다.');
        console.log('✅ 판매 모드가 활성화되었습니다. 자원을 클릭하여 판매하세요.');
        
        // 선택 해제
        this.clearSelection();
        
        // 보드 다시 렌더링 (시각적 효과 적용)
        this.renderBoard('main');
        
        console.log('🏁 toggleSellMode 함수 완료');
    }

    /**
     * 판매 모드 비활성화
     */
    deactivateSellMode() {
        console.log('🚀 deactivateSellMode 함수 시작');
        console.log('📊 현재 sellMode 상태:', this.sellMode);
        
        if (!this.sellMode) {
            console.log('⚠️ 판매 모드가 이미 비활성화되어 있습니다.');
            return;
        }
        
        // 판매 모드 비활성화
        this.sellMode = false;
        const sellButton = document.getElementById('sell-mode');
        
        console.log(`🔄 판매 모드 비활성화`);
        console.log('🔍 sellButton 요소:', sellButton);
        
        sellButton.classList.remove('sell-mode-active');
        sellButton.textContent = '💰 판매 모드';
        console.log('❌ 판매 모드가 비활성화되었습니다.');
        
        // 선택 해제
        this.clearSelection();
        
        // 보드 다시 렌더링 (시각적 효과 적용)
        this.renderBoard('main');
        
        console.log('🏁 deactivateSellMode 함수 완료');
    }

    /**
     * 자원 판매 가격 계산
     */
    calculateSellPrice(resource) {
        // 기본 가격: 레벨 * 타입별 기본값
        const baseValues = {
            water: 5,
            sand: 4, // sand는 여전히 sand로 유지 (타입 구분용)
            plant: 6,
            wood: 7
        };
        
        const baseValue = baseValues[resource.type] || 5;
        const sellPrice = baseValue * resource.level * resource.level; // 레벨의 제곱으로 증가
        
        console.log(`💰 판매 가격 계산: ${resource.getName()} (${resource.type} Lv.${resource.level}) = ${baseValue} × ${resource.level}² = ${sellPrice} 코인`);
        
        return sellPrice;
    }

    /**
     * 자원 판매
     */
    sellResource(resource, x, y) {
        const sellPrice = this.calculateSellPrice(resource);
        
        // 배열 경계 체크 및 자원 제거
        if (this.board[y] && this.board[y][x] === resource) {
            this.board[y][x] = null;
            
            // 코인 획득
            this.player.addCurrency('coins', sellPrice);
            
            // 애니메이션과 알림
            this.showNotification(`${resource.getName()}을(를) ${sellPrice} 코인에 판매했습니다!`);
            
            // 보드 다시 렌더링
            this.renderBoard('main');
            
            // 저장
            this.saveGameData();
            
            // 퀘스트 업데이트 (판매 관련 퀘스트가 있다면)
            this.updateQuests('sell', 1);
            
            // 자원 변동 후 건물 목록 UI 업데이트
            this.updateBuildingUI();
            
            console.log(`✅ 자원 판매 완료: ${resource.getName()} (${x}, ${y}) - ${sellPrice} 코인`);
        } else {
            console.error(`❌ 자원 판매 실패: 위치 (${x}, ${y})에서 자원을 찾을 수 없습니다.`);
            this.showNotification('자원을 찾을 수 없습니다. 다시 시도해주세요.');
        }
    }

    /**
     * 새 자원 생성 (15개 한계 시스템)
     */
    spawnNewResource() {
        // 쿨타임 중인지 확인
        if (this.isSpawnCooldown) {
            this.showNotification('쿨타임 중입니다. 잠시 후 다시 시도하세요.');
            return;
        }
        
        // 생성 횟수가 남아있는지 확인
        if (this.currentSpawnCount <= 0) {
            this.showNotification('생성 횟수를 모두 사용했습니다. 쿨타임 후 다시 사용 가능합니다.');
            return;
        }
        
        // 빈 칸이 있는지 확인
        const emptyCells = [];
        for (let y = 0; y < 5; y++) {
            for (let x = 0; x < 5; x++) {
                if (!this.board[y][x]) {
                    emptyCells.push({ x, y });
                }
            }
        }
        
        if (emptyCells.length === 0) {
            this.showNotification('보드에 빈 공간이 없습니다!');
            return;
        }
        
        // 새 자원 생성
        const newResource = this.spawnRandomResource('main');
        if (newResource) {
            this.currentSpawnCount--;
            this.updateSpawnUI();
            
            // 생성 횟수를 모두 사용했다면 쿨타임 시작
            if (this.currentSpawnCount <= 0) {
                this.startSpawnCooldown();
            }
        }
    }

    /**
     * 자원 생성 쿨타임 시작
     */
    startSpawnCooldown() {
        this.isSpawnCooldown = true;
        this.lastSpawnTime = Date.now();
        
        // 자원 생성 15회 소진 퀘스트 업데이트
        this.updateQuests('spawn_exhaust', 1);
        
        this.startSpawnCooldownWithTime(this.spawnCooldownTime);
    }

    /**
     * 지정된 시간으로 쿨타임 시작
     */
    startSpawnCooldownWithTime(initialTime) {
        const cooldownElement = document.getElementById('spawn-cooldown');
        const timerElement = document.getElementById('cooldown-timer');
        const spawnButton = document.getElementById('spawn-resource');
        
        if (!cooldownElement || !timerElement || !spawnButton) return;
        
        cooldownElement.style.display = 'block';
        spawnButton.classList.add('disabled');
        
        let remainingTime = initialTime;
        timerElement.textContent = remainingTime;
        
        // 기존 타이머가 있다면 정리
        if (this.spawnCooldownTimer) {
            clearInterval(this.spawnCooldownTimer);
        }
        
        this.spawnCooldownTimer = setInterval(() => {
            remainingTime--;
            timerElement.textContent = remainingTime;
            
            if (remainingTime <= 0) {
                clearInterval(this.spawnCooldownTimer);
                this.spawnCooldownTimer = null;
                this.isSpawnCooldown = false;
                
                // 생성 횟수 초기화
                this.currentSpawnCount = this.maxSpawnCount;
                this.updateSpawnUI();
                
                cooldownElement.style.display = 'none';
                spawnButton.classList.remove('disabled');
            }
        }, 1000);
    }

    /**
     * 자원 생성 UI 업데이트
     */
    updateSpawnUI() {
        const spawnCountElement = document.getElementById('spawn-count');
        const spawnCounterElement = document.getElementById('spawn-counter');
        const spawnButton = document.getElementById('spawn-resource');
        
        if (!spawnCountElement || !spawnCounterElement || !spawnButton) return;
        
        // 생성 횟수 표시 업데이트
        spawnCountElement.textContent = this.currentSpawnCount;
        
        // 최대 생성 횟수 표시 업데이트
        const spawnCounterText = spawnCounterElement.querySelector('span');
        if (spawnCounterText) {
            spawnCounterText.innerHTML = `생성 가능: <span id="spawn-count">${this.currentSpawnCount}</span>/${this.maxSpawnCount}`;
        }
        
        // 상태에 따른 스타일 변경
        spawnCounterElement.className = 'spawn-counter';
        if (this.currentSpawnCount === 0) {
            spawnCounterElement.classList.add('no-count');
        } else if (this.currentSpawnCount <= 5) {
            spawnCounterElement.classList.add('low-count');
        }
        
        // 버튼 상태 업데이트
        if (this.isSpawnCooldown || this.currentSpawnCount <= 0) {
            spawnButton.classList.add('disabled');
        } else {
            spawnButton.classList.remove('disabled');
        }
        
        // 버튼 텍스트 업데이트
        if (this.isSpawnCooldown) {
            spawnButton.textContent = '⏰ 쿨타임 중';
        } else if (this.currentSpawnCount <= 0) {
            spawnButton.textContent = '❌ 사용 불가';
        } else {
            spawnButton.textContent = '➕ 자원 생성';
        }
    }

    /**
     * UI 업데이트
     */
    updateUI() {
        try {
            // 플레이어 정보 업데이트 (안전한 참조)
            const playerLevel = document.getElementById('player-level');
            const currentExp = document.getElementById('current-exp');
            const requiredExp = document.getElementById('required-exp');
            const coins = document.getElementById('coins');
            const gems = document.getElementById('gems');
            const tickets = document.getElementById('tickets');
            const currentStage = document.getElementById('current-stage');

            if (playerLevel) playerLevel.textContent = this.player.level;
            if (currentExp) currentExp.textContent = this.player.experience;
            if (requiredExp) requiredExp.textContent = this.player.experienceToNext;
            if (coins) coins.textContent = this.player.coins;
            if (gems) gems.textContent = this.player.gems;
            if (tickets) tickets.textContent = this.player.tickets;

            // 현재 스테이지 정보
            if (currentStage) {
                currentStage.textContent = `${this.player.currentStage.world}-${this.player.currentStage.level}`;
            }

            // 음악 버튼 텍스트 업데이트
            this.updateMusicButtonText();

            this.updateQuestUI();
            this.updateBuildingUI();
            this.updateSpawnUI();
            this.updateStageListUI();
            
        } catch (error) {
            console.error('❌ UI 업데이트 중 오류:', error);
        }
    }

    /**
     * 퀘스트 UI 업데이트
     */
    updateQuestUI() {
        console.log('📋 퀘스트 UI 업데이트 시작');
        
        const questList = document.getElementById('quest-list');
        if (!questList) {
            console.error('❌ quest-list DOM 요소를 찾을 수 없습니다!');
            return;
        }
        
        questList.innerHTML = '';

        // 퀘스트가 없으면 초기 퀘스트 생성
        if (!this.quests || this.quests.length === 0) {
            console.log('⚡ 퀘스트 초기화 중...');
            this.quests = this.initializeQuests();
        }

        // 간단하게 모든 퀘스트 표시 (완료된 것도 일정 시간 표시)
        const displayQuests = this.quests.filter(quest => {
            if (!quest.completed) return true; // 미완료 퀘스트는 항상 표시
            // 완료된 퀘스트는 3초간만 표시
            if (quest.completedTime && Date.now() - quest.completedTime > 3000) {
                return false;
            }
            return true;
        });

        console.log(`📊 표시할 퀘스트: ${displayQuests.length}개`);
        
        if (displayQuests.length === 0) {
            const noQuestElement = document.createElement('div');
            noQuestElement.className = 'quest-item';
            noQuestElement.innerHTML = '<div class="quest-description">모든 퀘스트를 완료했습니다!</div>';
            questList.appendChild(noQuestElement);
            return;
        }

        displayQuests.forEach(quest => {
            const questElement = document.createElement('div');
            questElement.className = `quest-item ${quest.completed ? 'completed' : ''}`;
            
            const progressText = quest.objectives.map(obj => {
                const current = Math.min(quest.progress[obj.type] || 0, obj.amount);
                return `${current}/${obj.amount}`;
            }).join(', ');

            const rewardIcons = {
                coins: '💰',
                gems: '💎', 
                tickets: '🎫',
                experience: '⭐',
                resource_level2: '🎁'
            };

            questElement.innerHTML = `
                <div class="quest-title">${quest.title}</div>
                <div class="quest-description">${quest.description}</div>
                <div class="quest-progress">진행도: ${progressText}</div>
                <div class="quest-reward">보상: ${quest.rewards.map(r => 
                    `${rewardIcons[r.type] || '🎁'} ${r.amount}`
                ).join(', ')}</div>
            `;

            questList.appendChild(questElement);
        });
        
        console.log('✅ 퀘스트 UI 렌더링 완료');
    }

    /**
     * 건물 UI 업데이트
     */
    updateBuildingUI() {
        console.log('🏗️ 건물 UI 업데이트 시작');
        
        const buildingList = document.getElementById('building-list');
        if (!buildingList) {
            console.error('❌ building-list DOM 요소를 찾을 수 없습니다!');
            return;
        }
        
        buildingList.innerHTML = '';

        if (!this.player.buildings || this.player.buildings.length === 0) {
            console.log('⚡ 건물 목록 초기화 중...');
            this.player.buildings = this.player.initializeBuildings();
        }

        this.player.buildings.forEach(building => {
            const buildingElement = document.createElement('div');
            buildingElement.className = 'building-item';
            
            const buildingStatusText = building.isBuilt ? '🏆 건설 완료' : '🚧 미건설';
            const canBuild = !building.isBuilt && this.canBuildBuilding(building);

            // 골드 비용 표시
            const requiredGold = building.goldCost;
            const hasEnoughGold = this.player.coins >= requiredGold;
            const goldStatusIcon = hasEnoughGold ? '✅' : '❌';
            const goldTextColor = hasEnoughGold ? 'color: green' : 'color: red';
            
            // 요구사항과 보유량 비교 (자원)
            const requirementDetails = building.requirements.map(req => {
                const resource = new Resource(req.type, req.level);
                const currentCount = this.countResourcesInInventory(req.type, req.level);
                const hasEnough = currentCount >= req.amount;
                const statusIcon = hasEnough ? '✅' : '❌';
                const textColor = hasEnough ? 'color: green' : 'color: red';
                
                return `<span style="${textColor}">${statusIcon} ${resource.getIcon()} ${resource.getName()}(레벨${req.level}) ${currentCount}/${req.amount}개</span>`;
            }).join('<br>');
            
            // 골드 비용 표시 추가
            const goldRequirement = `<span style="${goldTextColor}">${goldStatusIcon} 💰 골드 ${this.player.coins}/${requiredGold}개</span>`;
            const allRequirements = requirementDetails + '<br>' + goldRequirement;

            const buttonText = '🏗️ 건설';
            const buttonClass = canBuild ? 'building-button available' : 'building-button unavailable';
            const buildingStatus = building.isBuilt ? 
                '<div class="building-status complete">🏆 건설 완료</div>' :
                canBuild ? '<div class="building-status ready">✅ 건설 가능</div>' :
                '<div class="building-status waiting">⏳ 자원 부족</div>';

            buildingElement.innerHTML = `
                <div class="building-header">
                    <div class="building-name">${building.name}</div>
                    <div class="building-status-text">${buildingStatusText}</div>
                </div>
                <div class="building-requirements">
                    <strong>필요 조건:</strong><br>
                    ${allRequirements}
                </div>
                ${buildingStatus}
                ${canBuild ? `<button class="${buttonClass}" onclick="window.game.buildBuilding('${building.id}')">${buttonText}</button>` : ''}
            `;

            buildingList.appendChild(buildingElement);
        });
        
        console.log('✅ 건물 UI 렌더링 완료');
    }

    /**
     * 건물 건설 가능 여부 확인
     */
    canBuildBuilding(building) {
        // 이미 건설된 건물은 건설할 수 없음
        if (building.isBuilt) {
            return false;
        }
        
        // 자원 조건 확인
        const hasEnoughResources = building.requirements.every(req => {
            const count = this.countResourcesInInventory(req.type, req.level);
            return count >= req.amount;
        });
        
        // 골드 조건 확인
        const hasEnoughGold = this.player.coins >= building.goldCost;
        
        return hasEnoughResources && hasEnoughGold;
    }

    /**
     * 건물 건설
     */
    buildBuilding(buildingId) {
        console.log(`🏗️ 건물 건설 시도: ${buildingId}`);
        
        const building = this.player.buildings.find(b => b.id === buildingId);
        if (!building) {
            this.showNotification('❌ 건물을 찾을 수 없습니다!');
            return;
        }

        if (building.isBuilt) {
            this.showNotification('🏆 이미 건설된 건물입니다!');
            return;
        }

        if (!this.canBuildBuilding(building)) {
            // 부족한 자원과 골드 상세 안내
            const missingItems = [];
            
            // 자원 부족 확인
            building.requirements.forEach(req => {
                const count = this.countResourcesInInventory(req.type, req.level);
                if (count < req.amount) {
                    const resource = new Resource(req.type, req.level);
                    missingItems.push(`${resource.getName()}(레벨${req.level}) ${count}/${req.amount}개`);
                }
            });
            
            // 골드 부족 확인
            if (this.player.coins < building.goldCost) {
                missingItems.push(`골드 ${this.player.coins}/${building.goldCost}개`);
            }
            
            this.showNotification(`❌ 건설 조건이 충족되지 않았습니다!\n부족한 항목: ${missingItems.join(', ')}`);
            return;
        }

        // 자원 소모
        building.requirements.forEach(req => {
            this.consumeResources(req.type, req.level, req.amount);
        });

        // 골드 소모
        this.player.spendCurrency('coins', building.goldCost);

        // 건물 건설 완료
        building.isBuilt = true;
        building.builtAt = new Date().toISOString();

        console.log(`🏗️ ${building.name} 건설 완료!`);
        this.showNotification(`🏗️ ${building.name} 건설이 완료되었습니다!`);

        // 건물 건설 퀘스트 업데이트
        if (building.id === 'beach') {
            this.updateQuests('building_beach', 1);
        } else if (building.id === 'resort') {
            this.updateQuests('building_resort', 1);
        } else if (building.id === 'pool') {
            this.updateQuests('building_pool', 1);
        }

        // UI 업데이트
        this.updateBuildingUI();
        this.updateSurroundingBuildings();
        this.updateUI();
        
        // 게임 데이터 저장
        this.saveGameData();
    }

    /**
     * 인벤토리의 자원 개수 확인
     */
    countResourcesInInventory(type, level) {
        let count = 0;
        for (let y = 0; y < 5; y++) {
            for (let x = 0; x < 5; x++) {
                const resource = this.board[y][x];
                if (resource && resource.type === type && resource.level === level) {
                    count++;
                }
            }
        }
        return count;
    }

    /**
     * 자원 소모 (인벤토리 우선, 부족분만 보드에서 차감)
     */
    consumeResources(type, level, amount) {
        console.log(`🗑️ 자원 소모 시작: ${type} 레벨 ${level} × ${amount}개`);
        let remaining = amount;
        let consumed = 0;
        // 1. 인벤토리에서 우선 차감
        const player = this.player;
        const invCount = player.getInventoryCount(type, level);
        if (invCount > 0) {
            const toRemove = Math.min(invCount, remaining);
            player.removeFromInventory(type, level, toRemove);
            remaining -= toRemove;
            consumed += toRemove;
            if (toRemove > 0) {
                console.log(`  ✅ 인벤토리에서 ${toRemove}개 차감`);
            }
        }
        // 2. 부족분만 메인 보드에서 차감
        for (let y = 0; y < 5 && remaining > 0; y++) {
            for (let x = 0; x < 5 && remaining > 0; x++) {
                const resource = this.board[y][x];
                if (resource && resource.type === type && resource.level === level) {
                    this.board[y][x] = null;
                    remaining--;
                    consumed++;
                    console.log(`  ✅ 보드에서 자원 소모: (${x}, ${y})에서 ${resource.getName()} 제거`);
                }
            }
        }
        if (remaining > 0) {
            console.warn(`⚠️ 자원 부족: ${amount}개 중 ${consumed}개만 소모됨, ${remaining}개 부족`);
        } else {
            console.log(`✅ 자원 소모 완료: ${consumed}개 소모됨`);
        }
        // 자원 변동 후 건물 목록 UI 업데이트
        this.updateBuildingUI();
    }

    /**
     * 머지 보드 주변 건물 업데이트
     */
    updateSurroundingBuildings() {
        console.log('🏗️ 주변 건물 업데이트 시작');
        
        if (!this.player.buildings) {
            console.warn('⚠️ 플레이어 건물 데이터가 없습니다.');
            return;
        }

        this.player.buildings.forEach(building => {
            const buildingElement = document.getElementById(`${building.id}-building`);
            if (!buildingElement) {
                console.warn(`⚠️ 건물 요소를 찾을 수 없습니다: ${building.id}-building`);
                return;
            }

            if (building.isBuilt) {
                // 건물이 건설되었으면 표시
                buildingElement.style.display = 'block';
                buildingElement.classList.add('visible', 'active');
                
                // 건설 완료 상태 표시
                const buildingCompleteElement = buildingElement.querySelector('.building-complete');
                if (buildingCompleteElement) {
                    buildingCompleteElement.style.display = 'block';
                    console.log(`🏗️ ${building.name} 건설 완료 상태로 표시됨`);
                }

                // 건설 애니메이션 효과 (새로 건설된 경우)
                if (!building.hasBeenBuilt) {
                    buildingElement.classList.add('constructing');
                    building.hasBeenBuilt = true;
                    
                    // 애니메이션 완료 후 클래스 제거
                    setTimeout(() => {
                        buildingElement.classList.remove('constructing');
                    }, 1000);
                }
            } else {
                // 건물이 건설되지 않았으면 숨기기
                buildingElement.style.display = 'none';
                buildingElement.classList.remove('visible', 'active');
                console.log(`🚫 ${building.name} 숨김 (미건설)`);
            }
        });
        
        console.log('✅ 주변 건물 업데이트 완료');
    }

    /**
     * 스테이지 UI 업데이트
     */
    updateStageUI() {
        try {
            const currentStage = this.getCurrentStage();
            if (!currentStage) return;

            const stageTitle = document.getElementById('stage-title');
            const stageGoal = document.getElementById('stage-goal');
            const stageTickets = document.getElementById('stage-tickets');

            if (stageTitle) {
                stageTitle.textContent = `${currentStage.world}-${currentStage.level}`;
            }
                
            // 클리어 조건에 따라 목표 표시 변경
            if (stageGoal) {
                if (currentStage.clearCondition === 'obstacles') {
                    const remainingObstacles = this.trashObstacles.length;
                    const totalObstacles = currentStage.obstacles.length;
                    const resourceCount = this.getStageResourceCount();
                    const boardSize = this.stageBoardSize;
                    stageGoal.innerHTML = `
                        🗑️ 모든 쓰레기 처리 (${totalObstacles - remainingObstacles}/${totalObstacles})<br>
                        💎 기본 자원: ${resourceCount}개 | 📏 보드: ${boardSize}x${boardSize} | 🎯 난이도: ${this.getStageDifficulty(currentStage.level)}
                    `;
                } else {
                    stageGoal.textContent = currentStage.getDescription();
                }
            }
            
            if (stageTickets) {
                stageTickets.textContent = `${this.player.tickets} (클리어 시 -1)`;
            }

            // 진행도 계산
            let totalProgress, totalRequired;
            
            if (currentStage.clearCondition === 'obstacles') {
                const remainingObstacles = this.trashObstacles.length;
                const totalObstacles = currentStage.obstacles.length;
                totalProgress = totalObstacles - remainingObstacles;
                totalRequired = totalObstacles;
            } else {
                totalProgress = currentStage.objectives.reduce((sum, obj) => {
                    const key = `create_${obj.resourceType}_${obj.resourceLevel}`;
                    return sum + Math.min(currentStage.progress[key] || 0, obj.amount);
                }, 0);
                totalRequired = currentStage.objectives.reduce((sum, obj) => sum + obj.amount, 0);
            }
            
            const stageProgress = document.getElementById('stage-progress');
            if (stageProgress) {
                stageProgress.textContent = `${totalProgress}/${totalRequired}`;
            }

            // 완료 버튼 상태
            const completeBtn = document.getElementById('stage-complete');
            if (completeBtn) {
                if (currentStage.checkCompletion()) {
                    completeBtn.classList.remove('disabled');
                    if (currentStage.clearCondition === 'obstacles') {
                        completeBtn.textContent = '모든 쓰레기 처리 완료!';
                    } else {
                        completeBtn.textContent = '스테이지 완료';
                    }
                } else {
                    completeBtn.classList.add('disabled');
                    if (currentStage.clearCondition === 'obstacles') {
                        completeBtn.textContent = '쓰레기 처리 진행중...';
                    } else {
                        completeBtn.textContent = '목표 달성 필요';
                    }
                }
            }
            
        } catch (error) {
            console.error('❌ 스테이지 UI 업데이트 중 오류:', error);
        }
    }

    /**
     * 스테이지 목록 UI 업데이트
     */
    updateStageListUI() {
        try {
            console.log('🎯 스테이지 목록 UI 업데이트 시작');
            console.log('📊 현재 상태:', {
                playerStage: this.player.currentStage,
                selectedStage: this.selectedStage
            });
            
            const stageList = document.getElementById('stage-list');
            const selectedStageElement = document.getElementById('selected-stage');
            
            if (!stageList || !selectedStageElement) {
                console.warn('⚠️ 스테이지 UI 요소를 찾을 수 없습니다.');
                return;
            }
            
            stageList.innerHTML = '';
            
            // 1-1부터 1-5까지 스테이지 버튼 생성
            for (let level = 1; level <= 5; level++) {
                const stageButton = document.createElement('button');
                stageButton.className = 'stage-item';
                const obstacleCount = level;
                const resourceCount = 2 + level;
                const boardSize = level === 1 ? 5 : (level <= 3 ? 6 : 7);
                stageButton.innerHTML = `
                    1-${level}<br>
                    <small>🗑️${obstacleCount} 💎${resourceCount} 📏${boardSize}x${boardSize}</small>
                `;
                
                // 현재 진행 가능한 스테이지까지만 활성화
                const maxLevel = this.player.currentStage.level;
                console.log(`🔍 스테이지 ${level} 체크: maxLevel=${maxLevel}`);
                
                // 모든 스테이지 클리어 시 (level 6 이상) 모든 스테이지를 완료 상태로 표시
                if (maxLevel > 5) {
                    // 모든 스테이지 완료 상태
                    stageButton.classList.add('completed');
                    console.log(`✅ 스테이지 ${level}: 모든 스테이지 클리어로 완료 표시`);
                } else if (level <= maxLevel) {
                    // 진행 가능한 스테이지
                    if (level < maxLevel || (level === maxLevel && maxLevel > 5)) {
                        // 이미 클리어한 스테이지
                        stageButton.classList.add('completed');
                        console.log(`✅ 스테이지 ${level}: 클리어됨`);
                    } else {
                        console.log(`🎯 스테이지 ${level}: 현재 진행 가능`);
                    }
                    
                    // 선택된 스테이지 표시
                    if (level === this.selectedStage.level) {
                        stageButton.classList.add('selected');
                        console.log(`🔴 스테이지 ${level}: 선택됨`);
                    }
                    
                    // 클릭 이벤트 추가
                    stageButton.addEventListener('click', () => {
                        this.selectStage(1, level);
                    });
                } else {
                    // 아직 해금되지 않은 스테이지
                    stageButton.disabled = true;
                    stageButton.title = `스테이지 1-${level - 1}을 클리어해야 해금됩니다`;
                    
                    // 비활성화된 스테이지 클릭 시 알림 표시
                    stageButton.addEventListener('click', () => {
                        this.showNotification(`스테이지 1-${level}은 아직 해금되지 않았습니다. 스테이지 1-${level - 1}을 클리어하세요.`);
                    });
                }
                
                // 모든 스테이지 클리어 후에는 모든 스테이지에 클릭 이벤트 추가 (재플레이 가능)
                if (maxLevel > 5) {
                    stageButton.addEventListener('click', () => {
                        this.selectStage(1, level);
                    });
                }
                
                stageList.appendChild(stageButton);
            }
            
            // 선택된 스테이지 표시 업데이트
            selectedStageElement.textContent = `${this.selectedStage.world}-${this.selectedStage.level}`;
            
            // 스테이지 시작 버튼 텍스트 업데이트
            const stageBtn = document.getElementById('stage-btn');
            if (stageBtn) {
                if (this.player.currentStage.level > 5) {
                    stageBtn.textContent = '🎊 챕터 1 클리어 완료! 축하합니다! 🎊';
                    stageBtn.classList.add('chapter-complete');
                } else {
                    stageBtn.textContent = '🎯 스테이지 시작 (클리어 시 티켓 -1)';
                    stageBtn.classList.remove('chapter-complete');
                }
            }
            
            console.log('✅ 스테이지 목록 UI 업데이트 완료');
            
        } catch (error) {
            console.error('❌ 스테이지 목록 UI 업데이트 중 오류:', error);
        }
    }

    /**
     * 스테이지 보드 크기 설정
     */
    setupStageBoardSize() {
        const currentStage = this.stages.find(stage => 
            stage.world === this.selectedStage.world && stage.level === this.selectedStage.level
        );
        
        if (currentStage && currentStage.boardSize) {
            this.stageBoardSize = currentStage.boardSize;
            console.log(`📏 스테이지 ${this.selectedStage.world}-${this.selectedStage.level}: ${this.stageBoardSize}x${this.stageBoardSize} 보드`);
            
            // 새로운 크기로 스테이지 보드 재생성
            this.stageBoard = Array(this.stageBoardSize).fill(null).map(() => 
                Array(this.stageBoardSize).fill(null)
            );
            console.log(`📋 스테이지 보드 배열 생성 완료: ${this.stageBoard.length}x${this.stageBoard[0]?.length}`);
        } else {
            // 기본값 5x5
            this.stageBoardSize = 5;
            this.stageBoard = Array(5).fill(null).map(() => Array(5).fill(null));
            console.log('📏 기본 5x5 보드 사용');
            console.log(`📋 기본 보드 배열 생성 완료: ${this.stageBoard.length}x${this.stageBoard[0]?.length}`);
        }
    }

    /**
     * 스테이지별 자원 생성 수 계산
     */
    getStageResourceCount() {
        if (!this.selectedStage) {
            return 8; // 기본값
        }
        
        const level = this.selectedStage.level;
        
        // 스테이지 레벨에 따라 자원 수 증가
        // 1-1: 8개, 1-2: 16개, 1-3: 24개, 1-4: 32개, 1-5: 40개
        const resourceCount = level * 8;
        
        console.log(`📊 스테이지 ${this.selectedStage.world}-${level}: 자원 ${resourceCount}개 생성`);
        return resourceCount;
    }

    /**
     * 현재 서브 머지 스테이지 보드에 있는 자원의 개수 계산
     */
    getCurrentStageResourceCount() {
        let count = 0;
        for (let y = 0; y < this.stageBoardSize; y++) {
            for (let x = 0; x < this.stageBoardSize; x++) {
                if (this.stageBoard[y][x]) {
                    count++;
                }
            }
        }
        console.log(`📊 서브 머지 스테이지 보드 현재 자원 개수: ${count}개`);
        return count;
    }

    /**
     * 스테이지 난이도 텍스트 반환
     */
    getStageDifficulty(level) {
        const difficulties = {
            1: '⭐ 쉬움',
            2: '⭐⭐ 보통',
            3: '⭐⭐⭐ 어려움',
            4: '⭐⭐⭐⭐ 매우 어려움',
            5: '⭐⭐⭐⭐⭐ 극한'
        };
        
        return difficulties[level] || '⭐ 쉬움';
    }

    /**
     * 스테이지 선택
     */
    selectStage(world, level) {
        // 비활성화된 스테이지 선택 방지
        if (level > this.player.currentStage.level) {
            console.log(`⚠️ 스테이지 ${world}-${level}은 아직 해금되지 않았습니다. 현재 진행 가능한 최고 레벨: ${this.player.currentStage.level}`);
            return;
        }
        
        this.selectedStage = { world, level };
        console.log(`🎯 스테이지 선택: ${world}-${level}`);
        this.updateStageListUI();
    }

    /**
     * 상점 UI 업데이트
     */
    updateShopUI() {
        const shopItems = document.getElementById('shop-items');
        const activeTab = document.querySelector('.shop-tab.active').dataset.tab;
        
        let items = '';
        
        if (activeTab === 'resources') {
            items = `
                <div class="shop-item">
                    <div class="shop-item-icon">🎫</div>
                    <div class="shop-item-name">티켓</div>
                    <div class="shop-item-price">💎 1</div>
                    <button onclick="window.game.buyItem('ticket')">구매</button>
                </div>
                <div class="shop-item">
                    <div class="shop-item-icon">💰</div>
                    <div class="shop-item-name">코인 팩</div>
                    <div class="shop-item-price">💎 2</div>
                    <button onclick="window.game.buyItem('coins')">구매</button>
                </div>
            `;
        } else if (activeTab === 'tools') {
            items = `
                <div class="shop-item ${this.player.hasAutoMerge ? 'purchased' : ''}">
                    <div class="shop-item-icon">🔄</div>
                    <div class="shop-item-name">자동 머지</div>
                    <div class="shop-item-description">드래그로 머지할 때 연쇄 머지가 자동으로 실행됩니다</div>
                    <div class="shop-item-price">💎 10</div>
                    <button onclick="window.game.buyItem('auto_merge')" ${this.player.hasAutoMerge ? 'disabled' : ''}>
                        ${this.player.hasAutoMerge ? '구매 완료' : '구매'}
                    </button>
                </div>
            `;
        } else if (activeTab === 'premium') {
            items = `
                <div class="shop-item">
                    <div class="shop-item-icon">💎</div>
                    <div class="shop-item-name">젬 팩</div>
                    <div class="shop-item-price">$4.99</div>
                    <button onclick="window.game.buyItem('gems_premium')" disabled>준비 중</button>
                </div>
            `;
        }
        
        shopItems.innerHTML = items;
    }

    /**
     * 상점 탭 전환
     */
    switchShopTab(tabName) {
        document.querySelectorAll('.shop-tab').forEach(tab => tab.classList.remove('active'));
        document.querySelector(`[data-tab="${tabName}"]`).classList.add('active');
        this.updateShopUI();
    }

    /**
     * 아이템 구매
     */
    buyItem(itemType) {
        if (itemType === 'ticket' && this.player.spendCurrency('gems', 1)) {
            this.player.addCurrency('tickets', 1);
            this.showNotification('티켓을 구매했습니다!');
            this.saveGameData(); // 구매 후 저장
        } else if (itemType === 'coins' && this.player.spendCurrency('gems', 2)) {
            this.player.addCurrency('coins', 100);
            this.showNotification('코인을 구매했습니다!');
            this.saveGameData(); // 구매 후 저장
        } else if (itemType === 'auto_merge') {
            if (this.player.spendCurrency('gems', 10)) {
                this.player.addAutoMerge(1); // 자동 머지 개수 증가
                this.showNotification('🔄 자동 머지 아이템을 획득했습니다!\n아이콘을 클릭해 사용하세요.');
                this.updateShopUI();
                this.saveGameData();
            } else {
                this.showNotification('젬이 부족합니다! (필요: 10젬)');
            }
        } else {
            this.showNotification('젬이 부족합니다!');
        }
    }

    /**
     * 자동 머지 아이템 획득 시 모든 머지 가능한 자원들을 자동으로 머지
     * 1회에 한해 실행되며, 연쇄 머지를 통해 모든 가능한 머지를 완료
     */
    async executeAutoMergeAll() {
        const board = this.board;
        const boardSize = board.length;
        let totalMerges = 0;
        let maxIterations = 50;
        let iteration = 0;
        while (iteration < maxIterations) {
            iteration++;
            // 1. 보드 위의 모든 자원을 flat하게 모음
            let resources = [];
            for (let y = 0; y < boardSize; y++) {
                for (let x = 0; x < boardSize; x++) {
                    const res = board[y][x];
                    if (res) resources.push({ x, y, res });
                }
            }
            // 2. 종류/레벨별로 그룹핑
            const groups = {};
            for (const { x, y, res } of resources) {
                const key = res.type + '_' + res.level;
                if (!groups[key]) groups[key] = [];
                groups[key].push({ x, y, res });
            }
            // 3. 2개 이상인 그룹을 찾아 임의의 2개를 합성
            let found = false;
            for (const key in groups) {
                const group = groups[key].filter(x => x && x.res);
                if (group.length >= 2) {
                    const a = group[0];
                    const b = group[1];
                    // 합성 전 board 상태 재확인
                    if (
                        !a || !b ||
                        !a.res || !b.res ||
                        !board[a.y] || !board[b.y] ||
                        board[a.y][a.x] !== a.res ||
                        board[b.y][b.x] !== b.res
                    ) {
                        continue;
                    }
                    const newLevel = a.res.level + 1;
                    if (typeof newLevel !== 'number' || newLevel > 4) continue;
                    await this.executeMerge([
                        { x: a.x, y: a.y, resource: a.res },
                        { x: b.x, y: b.y, resource: b.res }
                    ], 'main', true); // isAutoMerge: true
                    totalMerges++;
                    found = true;
                    await this.delay(600);
                    break; // for문만 break, while은 계속
                }
            }
            if (!found) break; // 더 이상 합성할 쌍이 없으면 종료
        }
        this.renderBoard('main');
        this.saveGameData();
        this.showNotification(`🔄 자동 머지 완료!\n총 ${totalMerges}회 합성되었습니다.`);
    }

    /**
     * 스테이지 클리어 성공 알림 표시
     */
    showStageCompleteNotification(stageInfo) {
        try {
            console.log(`🎉 스테이지 ${stageInfo.world}-${stageInfo.level} 클리어 성공 알림 표시`);
            const notificationText = document.getElementById('notification-text');
            const notification = document.getElementById('notification');
            if (notificationText && notification) {
                // 스테이지 클리어 성공 메시지 설정
                const stageName = `스테이지 ${stageInfo.world}-${stageInfo.level}`;
                const message = `🎯 ${stageName} 클리어 성공!<br><br>🏆 보상을 획득했습니다!<br><br>💰 코인 +10<br>💎 젬 +2<br>⭐ 경험치 +15`;
                // 버튼 2개 추가 (notificationText에만 추가)
                const buttonHtml = `
                    <div style="margin-top: 2rem; display: flex; gap: 1rem; justify-content: center;">
                        <button id="next-stage-btn" class="ui-button">다음 스테이지로 진행</button>
                        <button id="to-main-btn" class="ui-button">메인 화면으로 나가기</button>
                    </div>
                `;
                notificationText.innerHTML = message + buttonHtml;
                notification.classList.remove('hidden', 'chapter-complete');
                notification.classList.add('stage-complete');
                // 버튼 이벤트 등록 (자동 닫기 setTimeout 완전 제거)
                setTimeout(() => {
                    const nextBtn = document.getElementById('next-stage-btn');
                    const mainBtn = document.getElementById('to-main-btn');
                    if (nextBtn) {
                        nextBtn.onclick = () => {
                            this.hideStageCompleteNotification();
                            this.goToNextStage();
                        };
                    }
                    if (mainBtn) {
                        mainBtn.onclick = () => {
                            this.hideStageCompleteNotification();
                            this.showMainScreen();
                            this.saveGameData();
                        };
                    }
                }, 0);
            } else {
                console.warn('⚠️ 알림 요소를 찾을 수 없습니다.');
                this.showNotification(`🎯 스테이지 ${stageInfo.world}-${stageInfo.level} 클리어 성공!`);
            }
        } catch (error) {
            console.error('❌ 스테이지 클리어 성공 알림 표시 중 오류:', error);
            this.showNotification(`🎯 스테이지 ${stageInfo.world}-${stageInfo.level} 클리어 성공!`);
        }
    }

    /**
     * 스테이지 클리어 성공 알림 숨기기
     */
    hideStageCompleteNotification() {
        try {
            const notification = document.getElementById('notification');
            if (notification) {
                notification.classList.remove('stage-complete');
                notification.classList.add('hidden');
                console.log('🔽 스테이지 클리어 성공 알림 숨김 완료');
            }
        } catch (error) {
            console.error('❌ 스테이지 클리어 성공 알림 숨김 중 오류:', error);
        }
    }

    /**
     * 챕터 완료 알림 표시
     */
    showChapterCompleteNotification(chapterNumber) {
        try {
            console.log(`🏆 챕터 ${chapterNumber} 완료 알림 표시`);
            
            // DOM이 로드되지 않았을 수 있으므로 잠시 대기 후 다시 시도
            if (document.readyState !== 'complete') {
                console.log('⏳ DOM 로딩 대기 중...');
                setTimeout(() => this.showChapterCompleteNotification(chapterNumber), 100);
                return;
            }
            
            const notificationText = document.getElementById('notification-text');
            const notification = document.getElementById('notification');
            
            if (notificationText && notification) {
                // 챕터 완료 특별 메시지
                const chapterMessage = `🎊 축하합니다! 🎊\n\n챕터 ${chapterNumber} 완료!\n\n모든 스테이지를 성공적으로 클리어했습니다!\n🏆 특별 보상을 획득했습니다!`;
                
                notificationText.innerHTML = chapterMessage.replace(/\n/g, '<br>');
                notification.classList.remove('hidden');
                notification.classList.add('chapter-complete'); // 특별한 스타일 적용
                
                // 챕터 완료는 특별하므로 5초간 표시
                setTimeout(() => this.hideNotification(), 5000);
                
                console.log(`✅ 챕터 ${chapterNumber} 완료 알림 표시 완료`);
                
                // 챕터 완료 보상 지급
                this.grantChapterRewards(chapterNumber);
                
            } else {
                console.warn('⚠️ 챕터 완료 알림 요소를 찾을 수 없습니다.');
                // 대체 알림
                this.showNotification(`🎊 축하합니다! 챕터 ${chapterNumber} 완료! 🎊`);
            }
            
        } catch (error) {
            console.error('❌ 챕터 완료 알림 표시 중 오류:', error);
            // 대체 알림
            this.showNotification(`🎊 축하합니다! 챕터 ${chapterNumber} 완료! 🎊`);
        }
    }

    /**
     * 챕터 완료 버튼 클릭 시 알림 표시
     */
    showChapterCompleteClickNotification() {
        try {
            console.log('🎊 챕터 완료 버튼 클릭 알림 표시');
            
            // DOM이 로드되지 않았을 수 있으므로 잠시 대기 후 다시 시도
            if (document.readyState !== 'complete') {
                console.log('⏳ DOM 로딩 대기 중...');
                setTimeout(() => this.showChapterCompleteClickNotification(), 100);
                return;
            }
            
            const notificationText = document.getElementById('notification-text');
            const notification = document.getElementById('notification');
            
            if (notificationText && notification) {
                // 챕터 완료 클릭 시 특별 메시지
                const clickMessage = `🎊 축하합니다! 🎊\n\n챕터 1을 완전히 정복하셨습니다!\n\n🏆 전설의 휴양지 복구 완료!\n\n더 많은 모험이 곧 추가될 예정입니다.\n기대해 주세요! ✨`;
                
                notificationText.innerHTML = clickMessage.replace(/\n/g, '<br>');
                notification.classList.remove('hidden');
                notification.classList.add('chapter-complete'); // 특별한 스타일 적용
                
                // 특별 메시지는 7초간 표시
                setTimeout(() => this.hideNotification(), 7000);
                
                console.log('✅ 챕터 완료 클릭 알림 표시 완료');
                
            } else {
                console.warn('⚠️ 챕터 완료 클릭 알림 요소를 찾을 수 없습니다.');
                // 대체 알림
                this.showNotification('🎊 축하합니다! 챕터 1 완전 정복! 더 많은 모험이 곧 추가됩니다! 🎊');
            }
            
        } catch (error) {
            console.error('❌ 챕터 완료 클릭 알림 표시 중 오류:', error);
            // 대체 알림
            this.showNotification('🎊 축하합니다! 챕터 1 완전 정복! 더 많은 모험이 곧 추가됩니다! 🎊');
        }
    }

    /**
     * 챕터 완료 보상 지급
     */
    grantChapterRewards(chapterNumber) {
        console.log(`🎁 챕터 ${chapterNumber} 완료 보상 지급`);
        
        // 이미 완료한 챕터라면 보상 지급하지 않음
        if (this.player.completedChapters.has(chapterNumber)) {
            console.log(`⚠️ 챕터 ${chapterNumber}는 이미 완료했습니다 - 보상 지급 생략`);
            return;
        }
        
        // 챕터 완료 기록
        this.player.completedChapters.add(chapterNumber);
        
        if (chapterNumber === 1) {
            // 챕터 1 완료 보상
            this.player.addCurrency('coins', 500);
            this.player.addCurrency('gems', 20);
            this.player.addCurrency('tickets', 5);
            this.player.addExperience(100);
            
            console.log('🎁 챕터 1 완료 보상: 골드 500, 보석 20, 티켓 5, 경험치 100');
        }
        
        this.updateUI();
        this.saveGameData();
    }

    /**
     * 알림 표시
     */
    showNotification(message) {
        const notification = document.getElementById('notification');
        const notificationText = document.getElementById('notification-text');
        if (notification && notificationText) {
            // stage-complete 상태에서는 일반 알림으로 덮어쓰지 않음
            if (notification.classList.contains('stage-complete')) return;
            notificationText.innerHTML = message.replace(/\n/g, '<br>');
            notification.classList.remove('hidden', 'chapter-complete', 'stage-complete');
            notification.classList.add('notification');
            // ... 기타 알림 스타일 처리 ...
        }
    }

    /**
     * 알림 숨기기
     */
    hideNotification() {
        const notification = document.getElementById('notification');
        if (notification && notification.classList.contains('stage-complete')) {
            // 스테이지 클리어 선택 팝업일 때는 무시 (버튼 클릭으로만 닫힘)
            return;
        }
        if (notification) {
            notification.classList.add('hidden');
        }
    }

    /**
     * 자동 저장 설정
     */
    setupAutoSave() {
        // 30초마다 자동 저장
        this.autoSaveInterval = setInterval(() => {
            this.saveGameData();
        }, 30000);

        // 페이지 가시성 변경 시 저장 (탭 전환, 창 최소화 등)
        document.addEventListener('visibilitychange', () => {
            if (document.hidden) {
                this.saveGameData();
            }
        });

        // 브라우저 포커스 잃을 때 저장
        window.addEventListener('blur', () => {
            this.saveGameData();
        });
    }

    /**
     * 게임 초기화 확인 팝업 표시
     */
    showResetConfirmation() {
        document.getElementById('reset-confirmation').classList.remove('hidden');
    }

    /**
     * 게임 초기화 확인 팝업 숨기기
     */
    hideResetConfirmation() {
        document.getElementById('reset-confirmation').classList.add('hidden');
    }

    /**
     * 게임 완전 초기화 실행
     */
    confirmGameReset() {
        try {
            // 1. localStorage에서 모든 게임 데이터 삭제
            localStorage.removeItem('floraGame');
            
            // 2. 추가로 다른 관련 데이터도 삭제 (혹시 있을 수 있는)
            localStorage.removeItem('flora_backup');
            localStorage.removeItem('floraGameBackup');
            
            // 3. 자동 저장 타이머 정리
            if (this.autoSaveInterval) {
                clearInterval(this.autoSaveInterval);
            }
            if (this.spawnCooldownTimer) {
                clearInterval(this.spawnCooldownTimer);
            }
            
            // 4. 게임 상태를 완전히 초기화
            this.resetToInitialState();
            
            // 5. 초기화 완료 알림
            this.showNotification('🔄 게임이 완전히 초기화되었습니다. 새로운 게임을 시작합니다...');
            
            // 6. 팝업 숨기기
            this.hideResetConfirmation();
            
            // 7. 1초 후 완전 초기화된 게임 시작
            setTimeout(() => {
                this.startFreshGame();
            }, 1000);
            
        } catch (error) {
            console.error('게임 초기화 중 오류 발생:', error);
            this.showNotification('❌ 초기화 중 오류가 발생했습니다. 페이지를 수동으로 새로고침해주세요.');
            this.hideResetConfirmation();
        }
    }

    /**
     * 게임 상태를 초기 상태로 완전 리셋
     */
    resetToInitialState() {
        // 초기화 플래그 설정
        this.isResetting = true;
        
        // 배경음악 정지
        this.stopBackgroundMusic();
        
        // 플레이어 데이터 초기화
        this.player = new Player();
        
        // 보드 초기화
        this.board = Array(5).fill(null).map(() => Array(5).fill(null));
        this.stageBoard = Array(5).fill(null).map(() => Array(5).fill(null));
        
        // 게임 상태 초기화
        this.selectedCell = null;
        this.draggedResource = null;
        this.gameState = 'main';
        
        // 퀘스트 초기화
        this.quests = this.initializeQuests();
        
        // 스테이지 초기화
        this.stages = this.initializeStages();
        
        // 머지 히스토리 초기화
        this.mergeHistory = [];
        
        // 자원 생성 시스템 초기화
        this.sellMode = false;
        this.spawnCooldownTime = 30;
        this.lastSpawnTime = 0;
        this.spawnCooldownTimer = null;
        this.maxSpawnCount = 15;
        this.currentSpawnCount = 15;
        this.isSpawnCooldown = false;
    }

    /**
     * 완전히 새로운 게임 시작
     */
    startFreshGame() {
        // 강제로 초기 자원 생성 (저장된 데이터 완전 무시)
        this.forceSpawnInitialResources();
        
        // UI 업데이트
        this.renderBoard('main');
        this.updateUI();
        
        // 메인 화면 표시
        this.showMainScreen();
        
        // 주변 건물 초기화 (모든 건물 숨김)
        this.updateSurroundingBuildings();
        
        // 새로운 자동 저장 설정
        this.setupAutoSave();
        
        // 새로운 게임 시작 시 배경음악 설정
        this.setupBackgroundMusic();
        
        // 초기화 플래그 해제
        this.isResetting = false;
        
        // 초기화 완료 알림
        setTimeout(() => {
            this.showNotification('✨ 새로운 게임이 시작되었습니다! 즐거운 게임 되세요!');
        }, 500);
        
        // 새로운 게임 데이터 즉시 저장
        setTimeout(() => {
            this.saveGameData();
        }, 1000);
    }

    // 자동 머지 UI 갱신 함수
    updateAutoMergeUI() {
        const btn = document.getElementById('auto-merge-btn');
        const countSpan = document.getElementById('auto-merge-count');
        if (!btn || !countSpan) return;
        const count = this.player.getAutoMergeCount();
        countSpan.textContent = count;
        btn.disabled = count <= 0;
        btn.classList.toggle('disabled', count <= 0);
    }

    // 다음 스테이지로 이동하는 함수 추가
    goToNextStage() {
        // 다음 스테이지가 존재하는지 확인
        if (this.selectedStage.world === 1 && this.selectedStage.level < 5) {
            this.selectedStage.level++;
            this.player.currentStage = { ...this.selectedStage };
            this.startStage();
        } else {
            // 더 이상 다음 스테이지가 없으면 메인 화면으로 이동
            this.showNotification('더 이상 진행할 스테이지가 없습니다!');
            this.showMainScreen();
            this.saveGameData();
        }
    }

    renderStageList() {
        const stageList = document.getElementById('stage-list');
        if (!stageList) return;
        stageList.innerHTML = '';
        // selectedStage가 클리어된 스테이지라면 자동으로 미클리어 스테이지로 변경
        let selected = this.selectedStage;
        const isSelectedCleared = this.playerStage && this.playerStage[`1-${selected.level}`] && this.playerStage[`1-${selected.level}`].completed;
        if (isSelectedCleared) {
            // 가장 낮은 미클리어 스테이지 찾기
            for (let i = 1; i <= 5; i++) {
                if (!this.playerStage[`1-${i}`] || !this.playerStage[`1-${i}`].completed) {
                    this.selectedStage = { world: 1, level: i };
                    selected = this.selectedStage;
                    break;
                }
            }
        }
        for (let i = 1; i <= 5; i++) {
            const stage = this.stages.find(s => s.world === 1 && s.level === i);
            const li = document.createElement('li');
            li.className = 'stage-item';
            const isCleared = this.playerStage && this.playerStage[`1-${i}`] && this.playerStage[`1-${i}`].completed;
            li.textContent = `스테이지 1-${i}`;
            if (isCleared) {
                li.classList.add('cleared');
                li.classList.add('disabled');
                li.title = '이미 클리어한 스테이지입니다.';
            } else {
                if (selected.level === i) {
                    li.classList.add('selected');
                }
                li.addEventListener('click', () => {
                    this.selectStage(1, i);
                });
            }
            stageList.appendChild(li);
        }
        this.updateStageButtonState();
        this.bindStageButton();
    }

    updateStageButtonState() {
        // 스테이지 시작 버튼 활성/비활성 상태 갱신
        const stageBtn = document.getElementById('stage-btn');
        const selected = this.selectedStage;
        const isCleared = this.playerStage && this.playerStage[`1-${selected.level}`] && this.playerStage[`1-${selected.level}`].completed;
        if (stageBtn) {
            if (isCleared) {
                stageBtn.classList.add('disabled');
                stageBtn.disabled = true;
                stageBtn.title = '이미 클리어한 스테이지는 입장할 수 없습니다.';
            } else {
                stageBtn.classList.remove('disabled');
                stageBtn.disabled = false;
                stageBtn.title = '스테이지에 입장합니다.';
            }
        }
    }

    bindStageButton() {
        const stageBtn = document.getElementById('stage-btn');
        if (!stageBtn) return;
        stageBtn.onclick = () => {
            const selected = this.selectedStage;
            const isCleared = this.playerStage && this.playerStage[`1-${selected.level}`] && this.playerStage[`1-${selected.level}`].completed;
            if (isCleared) {
                this.showNotification('이미 클리어한 스테이지는 입장할 수 없습니다!');
                return;
            }
            this.startStage();
        };
    }
}

// ===== 전역 상수 노출 =====
// 상수들은 js/constants.js에서 전역 변수로 설정됨

// ===== 게임 시작 =====

let game;

// DOM 로드 완료 후 게임 시작
document.addEventListener('DOMContentLoaded', () => {
    window.game = new Game();
    // 게임 초기화 시작
    window.game.init();
});

// 페이지 종료 시 자동 저장
window.addEventListener('beforeunload', () => {
    if (window.game) {
        window.game.saveGameData();
    }
});

// 게임 시작 시 자동 머지 UI도 갱신
window.addEventListener('DOMContentLoaded', () => {
    if (window.game && window.game.updateAutoMergeUI) {
        window.game.updateAutoMergeUI();
    }
});

// 팝업 메시지가 떠있는 동안 ESC 키, notification 바깥 클릭, close-notification 버튼 등으로 닫히지 않도록 아래 코드 추가/수정
// 1. close-notification 버튼이 있다면, stage-complete 상태에서는 클릭해도 아무 동작하지 않게
const closeBtn = document.getElementById('close-notification');
if (closeBtn) {
    closeBtn.onclick = () => {
        const notification = document.getElementById('notification');
        if (notification && notification.classList.contains('stage-complete')) {
            // 스테이지 클리어 팝업일 때는 무시
            return;
        }
        // 그 외 일반 알림일 때만 닫기
        notification.classList.add('hidden');
    };
}
// 2. notification-content, notification-text, notification 바깥 클릭으로 닫히는 이벤트 리스너가 있다면 모두 제거
// 3. ESC 키로 닫히는 이벤트 리스너가 있다면 stage-complete 상태에서는 무시
window.addEventListener('keydown', (e) => {
    const notification = document.getElementById('notification');
    if (e.key === 'Escape' && notification && notification.classList.contains('stage-complete')) {
        // 스테이지 클리어 팝업일 때는 ESC로 닫히지 않게
        e.stopPropagation();
        e.preventDefault();
        return false;
    }
});
