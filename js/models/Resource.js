/**
 * 자원 데이터 관리 클래스
 * 자원의 타입, 레벨, 위치, 시각적 표현을 관리
 */
class Resource {
    constructor(type, level, x = -1, y = -1) {
        if (!type || typeof level !== 'number') throw new Error('Resource: type과 level은 필수입니다.');
        this.id = Date.now() + Math.random();
        this.type = type;
        this.level = level;
        this.x = x;
        this.y = y;
        this.element = null;
        this.imageElement = null;
        this.useImage = true;
    }

    getImagePath() {
        return window.RESOURCE_IMAGES?.[this.type]?.[this.level] || null;
    }

    getIcon() {
        return window.RESOURCE_ICONS?.[this.type]?.[this.level - 1] || '❓';
    }

    getName() {
        return window.RESOURCE_NAMES?.[this.type] || this.getBaseName();
    }

    getBaseName() {
        const baseNames = { water: '물', brick: '벽돌', plant: '식물', wood: '나무' };
        return baseNames[this.type] || '알 수 없음';
    }

    canEvolve() {
        return this.level < 4;
    }

    evolve() {
        if (!this.canEvolve()) return;
        this.level++;
        this.updateDisplay();
    }

    updateDisplay() {
        if (!this.element) return;
        if (this.useImage && this.getImagePath()) {
            this.createImageElement();
        } else {
            this.createIconElement();
        }
        this.element.className = `resource-item resource-${this.type} level-${this.level}`;
        this.element.title = `${this.getName()} (레벨 ${this.level})`;
    }

    createImageElement() {
        if (!this.element) return;
        this.element.innerHTML = '';
        const img = document.createElement('img');
        img.src = this.getImagePath();
        img.alt = `${this.getName()} 레벨 ${this.level}`;
        img.className = 'resource-image';
        img.style.width = '100%';
        img.style.height = '100%';
        img.style.objectFit = 'contain';
        img.onerror = () => {
            console.warn(`이미지 로드 실패: ${this.getImagePath()}, 아이콘으로 대체`);
            this.useImage = false;
            this.createIconElement();
        };
        this.element.appendChild(img);
        this.imageElement = img;
    }

    createIconElement() {
        if (!this.element) return;
        this.element.innerHTML = '';
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

    getSellPrice() {
        return Math.floor(5 * this.level * this.getTypeMultiplier());
    }

    getTypeMultiplier() {
        const multipliers = { water: 1.0, brick: 1.2, plant: 1.5, wood: 1.8 };
        return multipliers[this.type] || 1.0;
    }

    clone() {
        return new Resource(this.type, this.level, this.x, this.y);
    }

    matches(type, level) {
        return this.type === type && this.level === level;
    }
}

// 전역으로 내보내기
if (typeof module !== 'undefined' && module.exports) {
    module.exports = Resource;
} else {
    window.Resource = Resource;
}
