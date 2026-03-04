<template>
  <!-- 根容器：添加禁用态class -->
  <div class="er-upload" :class="{ 'is-disabled': isDisabled }">
    <!-- 隐藏的文件选择input：核心是触发文件选择 -->
    <input
      ref="inputRef"    
      class="er-upload__input"
      type="file"
      :name="name" <
      :accept="accept" 
      :multiple="multiple"
      :disabled="disabled" 
      @change="onInputChange" 
    />

    <!-- 上传触发区域：点击后触发input的点击事件 -->
    <div class="er-upload__trigger" @click="triggerInput">
      <slot>Upload</slot> <!-- 默认插槽：自定义上传按钮文字/样式 -->
    </div>

    <!-- 文件列表：展示已选择/上传的文件 -->
    <ul class="er-upload__list">
      <li v-for="file in innerList" :key="file.uid" class="er-upload__item">
        <span class="er-upload__name">{{ file.name }}</span> <!-- 文件名 -->
        <span class="er-upload__status">{{ file.status }}</span> <!-- 文件状态 -->
        <button 
          class="er-upload__remove" 
          type="button" 
          @click="handleRemove(file)" 
          :disabled="disabled"
        >
          × <!-- 删除按钮 -->
        </button>
      </li>
    </ul>

    <!-- 提示插槽：自定义提示文字（如“仅支持jpg/png文件”） -->
    <slot name="tip" />
  </div>
</template>

<script setup lang="ts">
// 导入Vue核心API
import { computed, ref, watch } from "vue";
// 导入自定义类型
import type { UploadEmits, UploadFile, UploadRawFile, UploadRequestOptions } from "./types";
import { uploadProps } from "./types";

defineOptions({ name: "ErUpload" });


// 1. 定义Props：使用之前写的uploadProps做校验
const props = defineProps(uploadProps);

// 2. 定义Emits：使用UploadEmits做类型约束
const emit = defineEmits<UploadEmits>();


// 3. 响应式数据：
// input的ref：用于手动触发点击/清空
const inputRef = ref<HTMLInputElement | null>(null);

// 内部文件列表：组件自己维护（避免直接修改props）
const innerList = ref<UploadFile[]>([...props.fileList]);

// 4. 计算属性：禁用态（简化模板中的判断）
const isDisabled = computed(() => props.disabled);


// 5. 监听props.fileList变化，同步到innerList
watch(
  () => props.fileList, // 监听目标：外部传入的文件列表
  (newVal) => {
    // 浅拷贝新数组，切断引用关联
    innerList.value = [...newVal];
  },
  { deep: true } // 深度监听：数组内部元素变化也触发
);


// 6. 更新文件列表：同步innerList并派发update:fileList事件
const updateList = (next: UploadFile[]) => {
  innerList.value = next;
  // 派发双向绑定事件：父组件可以用v-model:fileList
  emit("update:fileList", next);
};

// 7. 触发input点击：打开文件选择框
const triggerInput = () => {
  if (isDisabled.value) return; // 禁用态不执行
  inputRef.value?.click(); // 手动触发input的点击事件
};

// 8. 清空input的值：确保相同文件能重复选择
const resetInput = () => {
  if (inputRef.value) inputRef.value.value = "";
};

// 9. 处理文件删除
const handleRemove = (file: UploadFile) => {
  // 过滤掉要删除的文件
  const next = innerList.value.filter((item) => item.uid !== file.uid);
  // 更新列表
  updateList(next);
  // 派发remove事件：通知父组件
  emit("remove", file, next);
};


// 10. 执行上传请求：默认用XHR，支持自定义httpRequest
const doRequest = (options: UploadRequestOptions) => {
  // 如果用户传了自定义上传函数，优先使用
  if (props.httpRequest) return props.httpRequest(options);

  // 原生XHR上传逻辑
  const xhr = new XMLHttpRequest();
  // 打开POST请求
  xhr.open("POST", options.action);

  // 跨域携带cookie
  if (options.withCredentials) xhr.withCredentials = true;

  // 设置请求头
  if (options.headers) {
    Object.entries(options.headers).forEach(([key, value]) => {
      xhr.setRequestHeader(key, value);
    });
  }

  // 上传进度回调
  xhr.upload.onprogress = (evt) => {
    options.onProgress?.(evt);
  };

  // 上传成功回调
  xhr.onload = () => {
    options.onSuccess?.(xhr.response);
  };

  // 上传失败回调
  xhr.onerror = () => {
    options.onError?.(xhr.statusText);
  };

  // 构建FormData（文件上传必须用FormData）
  const formData = new FormData();
  // 添加额外参数
  if (options.data) {
    Object.entries(options.data).forEach(([key, value]) => {
      formData.append(key, value);
    });
  }
  // 添加文件
  formData.append(options.filename, options.file);

  // 发送请求
  xhr.send(formData);

  return xhr;
};


// 11. 上传单个文件
const uploadOne = async (file: UploadFile) => {
  // 拿到原生File对象（非空断言：因为上传时一定有raw）
  const raw = file.raw!;

  // 执行前置钩子：如果返回false，阻止上传
  if (props.beforeUpload) {
    const passed = await props.beforeUpload(raw);
    if (passed === false) return;
  }

  // 更新文件状态为上传中
  file.status = "uploading";
  updateList([...innerList.value]);

  // 执行上传请求
  doRequest({
    action: props.action, // 上传地址
    file: raw, // 原生文件
    filename: props.name, // 文件参数名
    data: props.data, // 额外参数
    headers: props.headers, // 请求头
    withCredentials: props.withCredentials, // 跨域cookie
    // 进度回调：更新上传进度
    onProgress: (evt) => {
      if (evt.lengthComputable) {
        // 计算进度（四舍五入）
        file.percentage = Math.round((evt.loaded * 100) / evt.total);
        updateList([...innerList.value]);
      }
    },
    // 成功回调：更新状态，派发事件
    onSuccess: (res) => {
      file.status = "success";
      file.response = res;
      file.percentage = 100;
      updateList([...innerList.value]);
      emit("success", res, file, innerList.value);
    },
    // 失败回调：更新状态，派发事件
    onError: (err) => {
      file.status = "error";
      file.error = err;
      updateList([...innerList.value]);
      emit("error", err, file, innerList.value);
    },
  });
};


// 12. 处理选中的文件（核心：包装成UploadFile）
const handleFiles = (files: FileList | null) => {
  if (!files || files.length === 0) return;

  // 把原生FileList转成数组，并包装成UploadFile
  const selected = Array.from(files).map((raw, idx) => {
    // 给原生File添加uid（唯一标识：时间戳+索引）
    const rawWithUid = Object.assign(raw, { uid: `${Date.now()}-${idx}` }) as UploadRawFile;
    // 构建UploadFile对象
    const uploadFile: UploadFile = {
      uid: rawWithUid.uid,
      name: rawWithUid.name,
      size: rawWithUid.size,
      status: "ready", // 初始状态：待上传
      percentage: 0, // 初始进度：0
      raw: rawWithUid, // 关联原生File
    };
    return uploadFile;
  });

  // 新的文件列表：原有列表 + 选中的文件
  const next = innerList.value.concat(selected);

  // 检查是否超出数量限制
  if (props.limit && next.length > props.limit) {
    // 派发超出限制事件
    emit("exceed", Array.from(files), innerList.value);
    // 清空input，结束逻辑
    return resetInput();
  }

  // 更新列表
  updateList(next);
  // 派发change事件：通知父组件文件变化
  emit("change", selected[selected.length - 1], next);

  // 如果开启自动上传，逐个上传选中的文件
  if (props.autoUpload) {
    selected.forEach((file) => uploadOne(file));
  }

  // 清空input：确保相同文件能重复选择
  resetInput();
};

// 13. input的change事件回调：处理文件选择
const onInputChange = (e: Event) => {
  // 类型断言：拿到input元素
  const target = e.target as HTMLInputElement;
  // 处理选中的文件
  handleFiles(target.files);
};
</script>


<style scoped>
@import './style.css'
</style>
