<template>
  <!-- 外层容器：固定高度，溢出滚动（AI 对话列表通常在底部，需反向滚动） -->
  <div 
    ref="listContainer"
    class="chat-list"
    @scroll="handleScroll"
    style="position: relative; height: 600px; overflow-y: auto; border: 1px solid #eee;"

  >
    <!-- 占位容器：用于撑开滚动条（高度 = 所有项的预估/缓存高度总和） -->
    <div class="placeholder-container" :style="{ height: totalHeight + 'px' }"></div>
    
    <!-- 可视区域容器：通过 transform 偏移，渲染当前可见项 -->
    <div 
      ref="visibleContainer"
      class="visible-container"
      :style="{ transform: `translateY(${offsetY}px)` }"
      style="position: absolute; top: 0; left: 0; width: 100%;"
    >
      <!-- 渲染当前可见的对话项 -->
      <div 
        v-for="item in visibleItems" 
        :key="item.id"
        ref="chatItemRefs"
        class="chat-item"
        :class="{ 'user': item.role === 'user', 'ai': item.role === 'assistant' }"
      >
        {{ item.content }}
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted, nextTick } from 'vue';

// ========== 核心数据 ==========
// AI 对话列表数据（模拟动态高度）
const chatList = ref([
  { id: 1, role: 'user', content: '你好' }, // 短消息
  { id: 2, role: 'assistant', content: '你好！我是 AI 助手，请问有什么可以帮助你的？' }, // 中等长度
  { id: 3, role: 'user', content: '解释一下虚拟滚动的动态高度实现，包括缓存策略、偏移校准，最好给出代码示例' }, // 长消息
  // 可追加更多测试数据（几百/几千条）
]);

// ========== 缓存相关 ==========
// 缓存已渲染项的真实高度：key=消息ID，value=真实高度
const heightCache = ref(new Map());
// 默认预估高度（兜底）
const defaultItemHeight = 80;

// ========== 虚拟滚动核心变量 ==========
const listContainer = ref(null); // 外层容器
const visibleContainer = ref(null); // 可视区域容器
const chatItemRefs = ref([]); // 已渲染项的 DOM 引用
const totalHeight = ref(0); // 列表总高度（缓存高度+预估高度）
const offsetY = ref(0); // 可视容器的偏移值
const visibleRange = reactive({ start: 0, end: 10 }); // 可视项的索引范围
const visibleItems = ref([]); // 当前可视的项

// ========== 核心方法 ==========
/**
 * 1. 计算列表总高度（结合缓存）
 */
const calculateTotalHeight = () => {
  let sum = 0;
  chatList.value.forEach(item => {
    // 有缓存用真实高度，无缓存用预估高度
    sum += heightCache.value.get(item.id) || defaultItemHeight;
  });
  totalHeight.value = sum;
};

/**
 * 2. 缓存已渲染项的真实高度（渲染后立即执行）
 */
const cacheItemHeights = async () => {
  await nextTick(); // 等待 DOM 渲染完成
  chatItemRefs.value.forEach((el, index) => {
    if (!el) return;
    const item = visibleItems.value[index];
    const realHeight = el.getBoundingClientRect().height;
    // 只有高度不一致时才更新缓存（避免重复计算）
    if (heightCache.value.get(item.id) !== realHeight) {
      heightCache.value.set(item.id, realHeight);
      // 缓存更新后，重新计算总高度（修正滚动条长度）
      calculateTotalHeight();
    }
  });
};

/**
 * 3. 计算滚动偏移值（核心：结合缓存高度）
 */
const calculateOffset = (scrollTop) => {
  let offset = 0;
  // 计算滚动位置之前的所有项的高度总和（用缓存/预估高度）
  for (let i = 0; i < visibleRange.start; i++) {
    const item = chatList.value[i];
    offset += heightCache.value.get(item.id) || defaultItemHeight;
  }
  return offset;
};

/**
 * 4. 获取可视区域的项范围（基于滚动位置）
 */
const getVisibleRange = (scrollTop) => {
  const containerHeight = listContainer.value.clientHeight;
  let currentTop = 0;
  let start = 0;
  let end = chatList.value.length - 1;

  // 找到滚动位置对应的起始项
  for (let i = 0; i < chatList.value.length; i++) {
    const itemHeight = heightCache.value.get(chatList.value[i].id) || defaultItemHeight;
    if (currentTop + itemHeight > scrollTop) {
      start = i;
      break;
    }
    currentTop += itemHeight;
  }

  // 找到可视区域的结束项（多渲染2项，避免滚动时空白）
  currentTop = 0;
  for (let i = start; i < chatList.value.length; i++) {
    const itemHeight = heightCache.value.get(chatList.value[i].id) || defaultItemHeight;
    currentTop += itemHeight;
    if (currentTop > containerHeight + 100) { // 100px 预加载缓冲
      end = i;
      break;
    }
  }

  return { start, end };
};

/**
 * 5. 更新可视项
 */
const updateVisibleItems = () => {
  const { start, end } = visibleRange;
  visibleItems.value = chatList.value.slice(start, end + 1);
  // 渲染后立即缓存真实高度
  cacheItemHeights();
};

/**
 * 6. 滚动监听（核心逻辑）
 */
const handleScroll = () => {
  const scrollTop = listContainer.value.scrollTop;
  // 1. 获取当前可视项范围
  const newRange = getVisibleRange(scrollTop);
  if (newRange.start !== visibleRange.start || newRange.end !== visibleRange.end) {
    visibleRange.start = newRange.start;
    visibleRange.end = newRange.end;
    // 2. 更新可视项
    updateVisibleItems();
  }
  // 3. 计算并设置偏移值（校准位置）
  offsetY.value = calculateOffset(scrollTop);
};

// ========== 初始化 ==========
onMounted(() => {
  // 首次计算总高度
  calculateTotalHeight();
  // 首次更新可视项
  updateVisibleItems();
  // 滚动到底部（AI 对话默认显示最新消息）
  listContainer.value.scrollTop = totalHeight.value;
});
</script>

<style scoped>
.chat-item {
  padding: 12px 16px;
  margin: 8px 0;
  border-radius: 8px;
  word-wrap: break-word;
}
.chat-item.user {
  background: #e8f4f8;
  margin-left: 20%;
}
.chat-item.ai {
  background: #f5f5f5;
  margin-right: 20%;
}
</style>