/**
 * 从 vnode 模块导入 h 函数，用于创建虚拟节点
 */
import { h } from './vnode'
/**
 * 从 render 模块导入 render 函数，用于将虚拟节点渲染到真实 DOM 上
 */
import { render } from './render'
/**
 * 从 @/utils 模块导入 isString 函数，用于判断一个值是否为字符串
 */
import { isString } from '@/utils'

/**
 * 创建一个应用实例
 * @param rootCompontent - 根组件，一个包含任意属性的对象
 * @returns 返回一个包含 mount 方法的应用实例
 */
export function createApp(rootCompontent: Record<string, any>) {
  const app = {
    /**
     * 将应用挂载到指定的根容器上
     * @param rootContainer - 根容器，可以是一个 HTMLElement 元素或一个 CSS 选择器字符串
     */
    mount(rootContainer: HTMLElement | string) {
      // 判断 rootContainer 是否为字符串
      if (isString(rootContainer)) {
        // 尝试通过选择器获取 DOM 元素
        if (document.querySelector(rootContainer as string)) {
          // 如果获取到元素，则将 rootContainer 替换为该元素
          rootContainer = document.querySelector(
            rootContainer as string
          ) as HTMLElement
        } else {
          // 如果未获取到元素，则直接返回
          return
        }
      }
      // 创建根组件的虚拟节点，并将其渲染到根容器上
      render(h(rootCompontent, null, null), rootContainer as HTMLElement)
    }
  }
  // 返回应用实例
  return app
}
