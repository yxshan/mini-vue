/**
 * 用于匹配 DOM 属性的正则表达式，匹配包含大写字母或特定属性名的键
 */
const domPropsRE = /[A-Z]|^(value|checked|selected|muted|disabled)$/

/**
 * 对比新旧属性并更新 DOM 元素的属性
 * @param oldProps - 旧的属性对象
 * @param newProps - 新的属性对象
 * @param el - 要更新属性的 DOM 元素
 */
export function patchProps(
  oldProps: Record<string, any>,
  newProps: Record<string, any>,
  el: HTMLElement
) {
  // 如果新旧属性对象相同，则直接返回，无需更新
  if (oldProps === newProps) return
  // 确保 oldProps 不为 null 或 undefined
  oldProps = oldProps || {}
  // 确保 newProps 不为 null 或 undefined
  newProps = newProps || {}
  // 遍历新属性对象，更新有变化的属性
  for (const key in newProps) {
    // 跳过 key 属性，因为它不应该作为 DOM 属性处理
    if (key === 'key') {
      continue
    }
    const next = newProps[key]
    const prev = oldProps[key]
    // 如果新属性值与旧属性值不同，则调用 patchDomProp 函数更新属性
    if (next !== prev) {
      patchDomProp(prev, next, key, el)
    }
  }
  // 遍历旧属性对象，移除在新属性对象中不存在的属性
  for (const key in oldProps) {
    if (newProps[key] == null) {
      patchDomProp(oldProps[key], null, key, el)
    }
  }
}

/**
 * 根据属性名更新 DOM 元素的具体属性
 * @param prev - 旧的属性值
 * @param next - 新的属性值
 * @param key - 属性名
 * @param el - 要更新属性的 DOM 元素
 */
function patchDomProp(prev: any, next: any, key: string, el: HTMLElement) {
  switch (key) {
    // 处理 class 属性
    case 'class':
      // 设置元素的类名，如果新值为空则设置为空字符串
      el.className = next || ''
      break
    // 处理 style 属性
    case 'style':
      if (next == null) {
        // 如果新的样式对象为空，则移除 style 属性
        el.removeAttribute('style')
      } else {
        // 遍历新的样式对象，更新元素的样式
        for (const styleName in next) {
          el.style[styleName] = next[styleName]
        }
        if (prev) {
          // 遍历旧的样式对象，移除在新样式对象中不存在的样式
          for (const styleName in prev) {
            if (next[styleName] == null) {
              el.style[styleName] = ''
            }
          }
        }
      }
      break
    default:
      // 处理事件监听器
      if (/^on[^a-z]/.test(key)) {
        const eventName = key.slice(2).toLowerCase()
        if (prev) {
          // 移除旧的事件监听器
          el.removeEventListener(eventName, prev)
        }
        if (next) {
          // 添加新的事件监听器
          el.addEventListener(eventName, next)
        }
      } else if (domPropsRE.test(key)) {
        // 处理 DOM 属性
        if (next === '' && typeof el[key] === 'boolean') {
          // 特殊处理布尔类型的 DOM 属性
          next = true
        }
        el[key] = next
      } else {
        // 处理普通属性
        if (next === false || next == null) {
          // 移除属性
          el.removeAttribute(key)
        } else {
          // 设置属性
          el.setAttribute(key, next)
        }
      }
      break
  }
}
