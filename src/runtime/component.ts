// 从响应式模块导入 reactive 函数，用于创建响应式对象
import { reactive } from '../reactivity/reactive'
// 从响应式模块导入 EffectFn 类型和 effect 函数，用于创建副作用函数
import { EffectFn, effect } from '../reactivity/effect'
// 从虚拟节点模块导入组件虚拟节点、虚拟节点类型和标准化虚拟节点函数
import { ComponentVnode, TypeVnode, normalizeVNode } from './vnode'
// 从调度器模块导入队列任务函数
import { queueJob } from './scheduler'
// 从渲染模块导入子虚拟节点、元素类型和 patch 函数
import { ChildVnode, TElement, patch } from './render'
import { isRef } from '@/reactivity/ref'

/**
 * 组件实例接口，定义了组件实例的结构
 */
export interface Instance {
  props: Record<string, any> | null // 组件自己声明的 prop
  attrs: Record<string, any> | null // 组件接收的自身未声明的 prop
  setupState: Record<string, any> | null // setup 返回的数据
  ctx: Record<string, any> | null // props + setupState: 传递给组件的 render 函数
  update: EffectFn | null // 更新组件的函数
  isMounted: boolean // 组件是否已经挂载
  subTree: TypeVnode | null // 虚拟 DOM 树
  next: ComponentVnode | null // 存新的组件虚拟 DOM
}

/**
 * 更新组件实例的 props 和 attrs
 * @param instance - 组件实例
 * @param vnode - 组件虚拟节点
 */
function updateProps(instance: Instance, vnode: ComponentVnode) {
  const { type: Compontent, props: vnodeProps } = vnode

  // 遍历虚拟节点的 props
  for (const key in vnodeProps) {
    // 如果组件声明了该 prop，则将其赋值给实例的 props
    if (Compontent.props?.includes(key)) {
      instance.props[key] = vnodeProps[key]
    } else {
      // 否则，将其赋值给实例的 attrs
      instance.attrs[key] = vnodeProps[key]
    }
  }
  // 将实例的 props 转换为响应式对象
  instance.props = reactive(instance.props)
}

/**
 * 将实例的 attrs 合并到子树的 props 中
 * @param instance - 组件实例
 * @param subTree - 子虚拟 DOM 树
 */
function fallThrough(instance: Instance, subTree: TypeVnode) {
  // 如果实例的 attrs 不为空
  if (Object.keys(instance.attrs).length) {
    // 将实例的 attrs 合并到子树的 props 中
    subTree.props = {
      ...instance.attrs,
      ...subTree.props
    }
  }
}

/**
 * 挂载组件到指定容器
 * @param vnode - 组件虚拟节点
 * @param container - 挂载的容器元素
 * @param anchor - 插入的锚点元素，默认为 null
 */
export function mountComponent(
  vnode: ComponentVnode,
  container: HTMLElement,
  anchor: TElement | ChildVnode | null = null
) {
  const { type: Component } = vnode

  // 创建组件实例并赋值给虚拟节点的 component 属性
  const instance: Instance = (vnode.component = {
    props: {},
    attrs: {},
    setupState: null,
    ctx: null,
    update: null,
    isMounted: false,
    subTree: null,
    next: null
  })

  // 更新组件实例的 props 和 attrs
  updateProps(instance, vnode)

  // 调用组件的 setup 函数并将结果赋值给实例的 setupState
  instance.setupState = Component.setup?.(instance.props, {
    attrs: instance.attrs
  })

  // 合并 props 和 setupState 到实例的 ctx
  instance.ctx = createAutoUnwrapProxy(instance)

  // 创建副作用函数，用于更新组件
  instance.update = effect(
    () => {
      // 如果组件还未挂载
      if (!instance.isMounted) {
        // 标准化组件的渲染结果并赋值给实例的 subTree
        instance.subTree = normalizeVNode(Component?.render(instance.ctx))
        // 将实例的 attrs 合并到子树的 props 中
        fallThrough(instance, instance.subTree)
        // 执行 patch 操作，将虚拟 DOM 渲染到容器中
        patch(null, instance.subTree, container, anchor)
        // 标记组件已挂载
        instance.isMounted = true
        // 将子树的真实 DOM 元素赋值给虚拟节点的 el 属性
        vnode.el = instance.subTree.el
      } else {
        // 如果有新的虚拟节点
        if (instance.next) {
          vnode = instance.next
          instance.next = null
          // 更新组件实例的 props 和 attrs
          updateProps(instance, vnode)
          // 重新合并 props 和 setupState 到实例的 ctx
          instance.ctx = {
            ...instance.props,
            ...instance.setupState
          }
        }
        // 保存旧的子树
        const prev = instance.subTree
        // 标准化组件的新渲染结果并赋值给实例的 subTree
        instance.subTree = normalizeVNode(Component.render(instance.ctx))
        // 将实例的 attrs 合并到子树的 props 中
        fallThrough(instance, instance.subTree)
        // 执行 patch 操作，更新虚拟 DOM
        patch(prev, instance.subTree, container, anchor)
        // 将新子树的真实 DOM 元素赋值给虚拟节点的 el 属性
        vnode.el = instance.subTree.el
      }
    },
    {
      // 使用调度器将副作用函数放入任务队列
      scheduler: (fn) => queueJob(fn)
    }
  )
}

// 创建自动解包代理
function createAutoUnwrapProxy(instance: Instance) {
  return new Proxy(
    {},
    {
      get(_, key: string | symbol) {
        // 明确 key 的类型
        // 1. 确保 key 是 string 类型
        if (typeof key !== 'string') return undefined

        // 2. 优先从 setupState 中获取
        if (key in instance.setupState!) {
          // 使用非空断言
          const value = instance.setupState![key] // 明确使用 string 类型索引
          return isRef(value) ? value.value : value
        }

        // 3. 从 props 中获取
        if (key in instance.props!) return instance.props![key]

        // 4. 从 attrs 中获取
        if (key in instance.attrs!) return instance.attrs![key]

        return undefined
      },
      set(_, key: string | symbol, value) {
        // 1. 确保 key 是 string 类型
        if (typeof key !== 'string') return false

        // 2. 只允许修改 setupState 中的属性
        if (key in instance.setupState!) {
          const ref = instance.setupState![key]

          // 如果是 ref 则修改其 value
          if (isRef(ref)) {
            ref.value = value
            return true
          }

          // 普通属性直接修改
          instance.setupState![key] = value
          return true
        }

        return false
      }
    }
  )
}
