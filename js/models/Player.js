import { BUILDINGS, EXPERIENCE_REQUIREMENTS, LEVEL_UP_REWARDS } from '../constants.js';

/**
 * 플레이어 데이터 관리 클래스
 * 레벨, 경험치, 재화, 건물 등의 플레이어 정보를 관리
 */
class Player {
    constructor() {
        this.level = 1;
        this.experience = 0;
        this.experienceToNext = 10;
        this.coins = 100;
        this.gems = 15;
        this.tickets = 3;
        this.inventory = [];
        this.unlockedStages = 1;
        this.currentStage = { world: 1, level: 1 };
        this.completedQuests = [];
        this.buildings = this.initializeBuildings();
        this.hasAutoMerge = false;
        this.rewardedLevels = new Set([1]);
        this.completedChapters = new Set();
    }

    initializeBuildings() {
        return Object.values(BUILDINGS).map(building => ({ ...building, isBuilt: false }));
    }

    addExperience(amount) {
        if (typeof amount !== 'number' || amount <= 0) return;
        this.experience += amount;
        while (this.experience >= this.experienceToNext) {
            this.experience -= this.experienceToNext;
            this.level++;
            this.experienceToNext = this.getExperienceRequired(this.level + 1);
            if (window.game && window.game.grantLevelUpReward && !this.rewardedLevels.has(this.level)) {
                this.rewardedLevels.add(this.level);
                window.game.grantLevelUpReward(this.level);
            }
        }
        window.game?.updateUI?.();
    }

    getExperienceRequired(targetLevel) {
        return EXPERIENCE_REQUIREMENTS[targetLevel] || 100;
    }

    getLevelUpRewards(level) {
        return LEVEL_UP_REWARDS[level] || null;
    }

    addCurrency(type, amount) {
        if (typeof amount !== 'number' || amount === 0) return;
        if (!['coins', 'gems', 'tickets'].includes(type)) return;
        this[type] += amount;
        window.game?.updateUI?.();
        if (type === 'coins') window.game?.updateBuildingUI?.();
    }

    spendCurrency(type, amount) {
        if (typeof amount !== 'number' || amount <= 0) return false;
        if (!['coins', 'gems', 'tickets'].includes(type)) return false;
        if (this[type] < amount) return false;
        this[type] -= amount;
        window.game?.updateUI?.();
        if (type === 'coins') window.game?.updateBuildingUI?.();
        return true;
    }

    getInventoryCount(type, level) {
        return this.inventory.filter(r => r.type === type && r.level === level).length;
    }

    addToInventory(resource) {
        if (!resource || !resource.type || typeof resource.level !== 'number') return false;
        if (this.getInventoryCount(resource.type, resource.level) >= 5) return false;
        this.inventory.push(resource);
        this.sortInventory();
        return true;
    }

    removeFromInventory(type, level, amount = 1) {
        if (!type || typeof level !== 'number' || amount <= 0) return false;
        let removed = 0;
        this.inventory = this.inventory.filter(r => {
            if (removed < amount && r.type === type && r.level === level) {
                removed++;
                return false;
            }
            return true;
        });
        return removed === amount;
    }

    sortInventory() {
        const typeOrder = ['wood', 'plant', 'water', 'brick'];
        this.inventory.sort((a, b) => {
            const typeA = typeOrder.indexOf(a.type);
            const typeB = typeOrder.indexOf(b.type);
            if (typeA !== typeB) return typeA - typeB;
            return a.level - b.level;
        });
    }
}

export { Player };
