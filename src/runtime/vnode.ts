import { isRef } from '@/reactivity/ref'
// 从 utils 模块导入类型判断函数
import { isObject, isString, isArray, isNumber } from '../utils'
// 从 component 模块导入 Instance 类型
import { Instance } from './component'

/**
 * 虚拟节点的基础接口，定义了虚拟节点的基本属性
 */
interface Vnode {
  // 虚拟节点的属性对象，可能为 null
  props: Record<string, any> | null
  // 虚拟节点的 key，用于优化 diff 算法
  key: any
  // 虚拟节点的类型标志，用于快速判断节点类型
  shapeFlag: number
  // 锚点节点，可能为 HTMLElement 或 Text 类型，也可能为 null
  anchor: HTMLElement | Text | null
}

/**
 * HTMLElementTagNameMap：元素标签名与对应元素类型的映射
 * 通用虚拟节点接口，继承自 Vnode 接口
 */
export interface TypeVnode extends Vnode {
  // 虚拟节点的类型，可以是 HTML 标签名、对象、Text 类型或 Fragment 类型
  type:
    | keyof HTMLElementTagNameMap
    | Record<string, any>
    | TextType
    | FragmentType
  // 虚拟节点的子节点，可以是 TypeVnode 数组、字符串、数字或 null
  children: TypeVnode[] | string | number | null
  // 虚拟节点对应的真实 DOM 元素，可能为 HTMLElement 或 Text 类型，也可能为 null
  el: HTMLElement | Text | null
  // 组件实例对象，可能为对象或 null
  component: Record<string, any> | null
}

/**
 * 元素虚拟节点接口，继承自 Vnode 接口
 */
export interface ElementVnode extends Vnode {
  // 元素虚拟节点的类型，必须是 HTML 标签名
  type: keyof HTMLElementTagNameMap
  // 元素虚拟节点的子节点，可以是 TypeVnode 数组、字符串或 null
  children: TypeVnode[] | string | null
  // 元素虚拟节点对应的真实 DOM 元素，可能为 HTMLElement 类型，也可能为 null
  el: HTMLElement | null
}

/**
 * 组件虚拟节点接口，继承自 Vnode 接口
 */
export interface ComponentVnode extends Vnode {
  // 组件虚拟节点的类型，可以是任意类型
  type: any
  // 组件虚拟节点的子节点，可以是 TypeVnode 数组、字符串或 null
  children: TypeVnode[] | string | null
  // 组件实例，可能为 Instance 类型，也可能为 null
  component: Instance | null
  // 组件虚拟节点对应的真实 DOM 元素，可能为 HTMLElement 或 Text 类型，也可能为 null
  el: HTMLElement | Text | null
}

/**
 * Fragment 虚拟节点接口，继承自 Vnode 接口
 */
export interface FragmentVnode extends Vnode {
  // Fragment 虚拟节点的类型，必须是 FragmentType 类型
  type: FragmentType
  // Fragment 虚拟节点对应的真实 DOM 元素，可能为 Text 类型，也可能为 null
  el: Text | null
  // Fragment 虚拟节点的子节点，可以是 TypeVnode 数组、字符串或 null
  children: TypeVnode[] | string | null
}

/**
 * Text 虚拟节点接口
 */
export interface TextVnode {
  // Text 虚拟节点的类型，必须是 TextType 类型
  type: TextType
  // Text 虚拟节点的类型标志，用于快速判断节点类型
  shapeFlag: number
  // Text 虚拟节点的文本内容
  children: string
  // Text 虚拟节点对应的真实 DOM 元素，可能为 Text 类型，也可能为 null
  el: Text | null
  // 锚点节点，可能为 HTMLElement 类型，也可能为 null
  anchor: HTMLElement | null
}

/**
 * Text 类型的别名，指向 Text 常量的类型
 */
export type TextType = typeof Text
/**
 * Fragment 类型的别名，指向 Fragment 常量的类型
 */
export type FragmentType = typeof Fragment

/**
 * 表示文本节点的唯一符号
 */
// 注意：若 TypeScript 报错 “Symbol” 仅指类型，需将 “lib” 编译器选项更改为 es2015 或更高版本
export const Text = Symbol('Text')
/**
 * 表示 Fragment 节点的唯一符号
 */
// 注意：若 TypeScript 报错 “Symbol” 仅指类型，需将 “lib” 编译器选项更改为 es2015 或更高版本
export const Fragment = Symbol('Fragment')

/**
 * 定义虚拟节点的类型标志常量
 */
export const ShapeFlags = {
  // 元素节点标志
  ELEMENT: 1,
  // 文本节点标志
  TEXT: 1 << 1,
  // Fragment 节点标志
  FRAGMENT: 1 << 2,
  // 组件节点标志
  COMPONENT: 1 << 3,
  // 文本子节点标志
  TEXT_CHILDREN: 1 << 4,
  // 数组子节点标志
  ARRAY_CHILDREN: 1 << 5,
  // 子节点标志，包含文本子节点和数组子节点
  CHILDREN: (1 << 4) | (1 << 5)
}

/**
 * 创建虚拟节点的工厂函数
 * @param type - 虚拟节点的类型，可以是 HTML 标签名、对象、Text 类型或 Fragment 类型
 * @param props - 虚拟节点的属性对象，默认为 null
 * @param children - 虚拟节点的子节点，可以是 TypeVnode 数组、字符串、数字或 null，默认为 null
 * @returns 返回一个 TypeVnode 类型的虚拟节点
 */
export function h(
  type:
    | keyof HTMLElementTagNameMap
    | Record<string, any>
    | TextType
    | FragmentType,
  props: Record<string, any> | null = null,
  children: TypeVnode[] | string | number | null = null
): TypeVnode {
  // 初始化虚拟节点的类型标志
  let shapeFlag = 0
  // 根据 type 类型设置 shapeFlag
  if (isString(type)) {
    shapeFlag = ShapeFlags.ELEMENT
  } else if (type === Text) {
    shapeFlag = ShapeFlags.TEXT
  } else if (type === Fragment) {
    shapeFlag = ShapeFlags.FRAGMENT
  } else {
    shapeFlag = ShapeFlags.COMPONENT
  }

  // 根据 children 类型更新 shapeFlag
  if (isString(children) || isNumber(children)) {
    shapeFlag |= ShapeFlags.TEXT_CHILDREN
    children = String(children)
  } else if (isArray(children)) {
    shapeFlag |= ShapeFlags.ARRAY_CHILDREN
  }

  // 返回创建好的虚拟节点
  return {
    type,
    props,
    children,
    shapeFlag,
    el: null,
    anchor: null, // fragment专有
    key: props && (props.key != null ? props.key : null),
    component: null // 组件的instance
  }
}

/**
 * 将任意结果规范化为虚拟节点
 * @param result - 任意类型的结果
 * @returns 返回一个规范化后的 TypeVnode 类型的虚拟节点
 */
export function normalizeVNode(result: any) {
  // 如果结果是数组，创建一个 Fragment 虚拟节点
  if (isArray(result)) return h(Fragment, null, result.map(normalizeVNode))
  // 如果结果是对象，直接返回
  if (isObject(result)) {
    if (isRef(result)) {
      return normalizeVNode(result.value)
    }
    return result
  }
  // 否则，创建一个 Text 虚拟节点
  return h(Text, null, result.toString())
}
