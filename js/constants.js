/**
 * 게임 상수 및 리소스/빌딩/퀘스트 등 공통 데이터 정의
 * - SRP, DRY, 가독성, 예외처리 강화
 */

// 게임 설정
const GAME_CONFIG = {
    BOARD_SIZE: 5,
    MAX_RESOURCE_LEVEL: 4,
    AUTO_SAVE_INTERVAL: 30000,
    STAGE_AUTO_SAVE_INTERVAL: 10000,
    COMBO_TIMEOUT: 3000,
    MAX_SPAWN_COUNT: 10
};

// 자원 타입
const RESOURCE_TYPES = Object.freeze({
    WATER: 'water',
    BRICK: 'brick', // sand -> brick
    PLANT: 'plant',
    WOOD: 'wood'
});

// 자원 이미지 경로 (레벨별)
const RESOURCE_IMAGES = Object.freeze({
    water: { 1: 'Art/Stone1.png', 2: 'Art/Stone2.png', 3: 'Art/Stone3.png', 4: 'Art/Stone4.png' },
    brick:  { 1: 'Art/Stone1.png', 2: 'Art/Stone2.png', 3: 'Art/Stone3.png', 4: 'Art/Stone4.png' }, // sand -> brick
    plant: { 1: 'Art/Seed1.png', 2: 'Art/Seed2.png', 3: 'Art/Seed3.png', 4: 'Art/Seed4.png' },
    wood:  { 1: 'Art/Wood1.png', 2: 'Art/Wood2.png', 3: 'Art/Wood3.png', 4: 'Art/Wood4.png' }
});

// 자원 아이콘 (레벨별)
const RESOURCE_ICONS = Object.freeze({
    water: ['💧', '🌊', '💦', '🚰'], // 물 느낌 아이콘
    brick: ['🧱', '🏗️', '🏢', '🏰✨'], // 기존 sand(모래) 아이콘 = 벽돌
    plant: ['🌱', '🌿', '🌳', '🌲✨'],
    wood:  ['🪵', '🛖', '🏘️', '🏙️']
});

// 자원 이름
const RESOURCE_NAMES = Object.freeze({
    water: '물',
    brick:  '벽돌', // sand -> brick
    plant: '식물',
    wood:  '나무'
});

// 자원 색상 (CSS 클래스명)
const RESOURCE_COLORS = Object.freeze({
    water: 'resource-water',
    brick:  'resource-brick', // sand -> brick
    plant: 'resource-plant',
    wood:  'resource-wood'
});

// 건물 정보
const BUILDINGS = Object.freeze({
    beach: {
        id: 'beach', name: '해변가', goldCost: 150,
        requirements: [
            { type: 'water', level: 2, amount: 3 },
            { type: 'plant', level: 1, amount: 4 }
        ]
    },
    resort: {
        id: 'resort', name: '리조트', goldCost: 450,
        requirements: [
            { type: 'wood', level: 3, amount: 2 },
            { type: 'water', level: 2, amount: 3 }
        ]
    },
    pool: {
        id: 'pool', name: '수영장', goldCost: 550,
        requirements: [
            { type: 'water', level: 3, amount: 1 },
            { type: 'water', level: 2, amount: 3 }
        ]
    }
});

// 레벨업 필요 경험치
const EXPERIENCE_REQUIREMENTS = Object.freeze({
    2: 10, 3: 20, 4: 30, 5: 40, 6: 60, 7: 70, 8: 80, 9: 90, 10: 100
});

// 레벨업 보상
const LEVEL_UP_REWARDS = Object.freeze({
    1: { type: 'gold', amount: 100, name: '골드 100개' },
    2: { type: 'resource_box_level2', amount: 1, name: '2단계 자원 선택 상자 1개' },
    3: { type: 'tickets', amount: 2, name: '스테이지 티켓 2개' },
    4: { type: 'spawn_bonus', amount: 5, name: '자원 생산 횟수 5회 추가' },
    5: { type: 'gems', amount: 30, name: '보석 30개' },
    6: { type: 'auto_merge', amount: 1, name: '자동 머지 아이템 1개' },
    7: { type: 'resource_box_level3', amount: 1, name: '3단계 자원 선택 상자 1개' },
    8: { type: 'gold', amount: 200, name: '골드 200개' },
    9: { type: 'gems', amount: 40, name: '보석 40개' }
});

// 스테이지 설정
const STAGE_CONFIG = Object.freeze({
    DEFAULT_TICKET_COST: 1,
    BOARD_SIZE_LEVEL_1: 4,
    BOARD_SIZE_LEVEL_2: 5,
    BOARD_SIZE_LEVEL_3: 6,
    BOARD_SIZE_LEVEL_4: 7,
    BOARD_SIZE_LEVEL_5: 8
});

// 퀘스트 타입
const QUEST_TYPES = Object.freeze({
    MERGE_RESOURCE: 'merge_resource',
    COLLECT_RESOURCE: 'collect_resource',
    COMPLETE_STAGE: 'complete_stage'
});

// 로컬 스토리지 키
const STORAGE_KEYS = Object.freeze({
    GAME_DATA: 'floraGame_data',
    STAGE_PROGRESS: 'floraGame_stageProgress',
    OBSTACLES_DATA: 'floraGame_obstacles',
    BOARD_DATA: 'floraGame_board',
    QUEST_DATA: 'floraGame_quests'
});

// 애니메이션 지속 시간
const ANIMATION_DURATIONS = Object.freeze({
    MERGE: 500,
    SPAWN: 300,
    COMBO: 1000,
    DAMAGE: 200,
    BUILDING_GLOW: 2000
});

// 콤보 설정
const COMBO_CONFIG = Object.freeze({
    MIN_COMBO: 2,
    MAX_COMBO: 10,
    BONUS_MULTIPLIER: 0.5,
    TIMEOUT: 3000
});

// 장애물 설정
const OBSTACLE_CONFIG = Object.freeze({
    GARBAGE: { maxHp: 100, damage: 25 },
    BIG_GARBAGE: { maxHp: 200, damage: 35 },
    TOXIC_GARBAGE: { maxHp: 150, damage: 30 },
    RECYCLING: { maxHp: 80, damage: 20 },
    COMPOST: { maxHp: 120, damage: 25 }
});

// 전역(window) 등록 (Resource.js 등에서 사용)
if (typeof window !== 'undefined') {
    window.RESOURCE_IMAGES = RESOURCE_IMAGES;
    window.RESOURCE_ICONS = RESOURCE_ICONS;
    window.RESOURCE_NAMES = RESOURCE_NAMES;
}
