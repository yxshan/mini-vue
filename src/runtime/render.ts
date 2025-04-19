/**
 * 从 vnode 模块导入各种虚拟节点类型和形状标志
 */
import {
  ComponentVnode,
  ElementVnode,
  FragmentVnode,
  ShapeFlags,
  TextVnode,
  TypeVnode
} from './vnode'
/**
 * 从 patchProps 模块导入 patchProps 函数，用于更新 DOM 属性
 */
import { patchProps } from './patchProps'
/**
 * 从 component 模块导入 mountComponent 函数，用于挂载组件
 */
import { mountComponent } from './component'

/**
 * 扩展 HTMLElement 接口，添加 _vnode 属性，用于存储虚拟节点
 */
export interface TElement extends HTMLElement {
  _vnode?: TypeVnode | null
}
/**
 * 扩展 ChildNode 接口，添加 _vnode 属性，用于存储虚拟节点
 */
export interface ChildVnode extends ChildNode {
  _vnode?: TypeVnode | null
}

/**
 * 渲染虚拟节点到指定的容器中
 * @param vnode - 要渲染的虚拟节点，如果为 null 则卸载之前的节点
 * @param container - 渲染的目标容器
 */
export function render(vnode: TypeVnode | null, container: TElement) {
  // 获取容器上之前存储的虚拟节点
  const prevVNode = container._vnode
  if (!vnode) {
    if (prevVNode) {
      // 如果新的虚拟节点为 null 且之前有虚拟节点，则卸载之前的节点
      unmount(prevVNode)
    }
  } else {
    // 否则，进行虚拟节点的补丁操作
    patch(prevVNode, vnode, container)
  }
  // 更新容器上存储的虚拟节点
  container._vnode = vnode
}

/**
 * 判断两个虚拟节点是否为同一个组件
 * @param preVnode - 旧的虚拟节点
 * @param newVnode - 新的虚拟节点
 * @returns 如果是同一个组件则返回 true，否则返回 false
 */
function isSameComponent(preVnode: TypeVnode, newVnode: TypeVnode) {
  return preVnode.type === newVnode.type
}

/**
 * 对新旧虚拟节点进行补丁操作
 * @param preVnode - 旧的虚拟节点
 * @param newVnode - 新的虚拟节点
 * @param container - 渲染的目标容器
 * @param anchor - 插入节点的锚点，默认为 null
 */
export function patch(
  preVnode: TypeVnode | null | undefined,
  newVnode: TypeVnode,
  container: TElement,
  anchor: TElement | ChildVnode | null = null
) {
  // 获取新虚拟节点的形状标志
  const { shapeFlag } = newVnode

  if (preVnode && !isSameComponent(preVnode, newVnode)) {
    // 如果新旧节点不是同一个组件，则卸载旧节点并更新锚点
    anchor = (preVnode.anchor || preVnode.el).nextSibling
    unmount(preVnode)
    preVnode = null
  }

  if (shapeFlag & ShapeFlags.ELEMENT) {
    // 如果是元素节点，则处理元素节点
    processElement(
      preVnode as ElementVnode,
      newVnode as ElementVnode,
      container,
      anchor
    )
  } else if (shapeFlag & ShapeFlags.TEXT) {
    // 如果是文本节点，则处理文本节点
    processText(preVnode as any, newVnode as any, container, anchor)
  } else if (shapeFlag & ShapeFlags.FRAGMENT) {
    // 如果是片段节点，则处理片段节点
    processFragment(
      preVnode as FragmentVnode,
      newVnode as FragmentVnode,
      container,
      anchor
    )
  } else if (shapeFlag & ShapeFlags.COMPONENT) {
    // 如果是组件节点，则处理组件节点
    processComponent(preVnode, newVnode, container, anchor)
  }
}

/**
 * 挂载元素节点到指定容器
 * @param vnode - 要挂载的元素虚拟节点
 * @param container - 挂载的目标容器
 * @param anchor - 插入节点的锚点，默认为 null
 */
function mountElement(
  vnode: ElementVnode,
  container: TElement,
  anchor: TElement | ChildVnode | null = null
) {
  const { type, props, shapeFlag, children } = vnode
  // 创建 DOM 元素并存储到虚拟节点的 el 属性中
  const el = (vnode.el = document.createElement(type))
  // 更新 DOM 元素的属性
  patchProps(null, props, el)
  if (shapeFlag & ShapeFlags.TEXT_CHILDREN) {
    // 如果有文本子节点，则设置元素的文本内容
    el.textContent = children as string
  } else if (shapeFlag & ShapeFlags.ARRAY_CHILDREN) {
    // 如果有数组子节点，则递归挂载子节点
    mountChildren(children as TypeVnode[], el, null)
  }

  if (props) {
    // 再次更新 DOM 元素的属性
    patchProps(null, props, el)
  }

  // 将元素插入到指定位置
  container.insertBefore(el, anchor)
}

/**
 * 挂载文本节点到指定容器
 * @param vnode - 要挂载的文本虚拟节点
 * @param container - 挂载的目标容器
 * @param anchor - 插入节点的锚点，默认为 null
 */
function mountTextNode(
  vnode: TextVnode,
  container: TElement,
  anchor: TElement | ChildVnode | null = null
) {
  // 创建文本节点
  const textNode = document.createTextNode(vnode.children)
  // 存储文本节点到虚拟节点的 el 属性中
  vnode.el = textNode
  // 将文本节点插入到指定位置
  container.insertBefore(textNode, anchor)
}

/**
 * 递归挂载多个子节点
 * @param children - 要挂载的子节点数组
 * @param container - 挂载的目标容器
 * @param anchor - 插入节点的锚点，默认为 null
 */
function mountChildren(
  children: TypeVnode[],
  container: TElement,
  anchor: TElement | ChildVnode | null = null
) {
  // 遍历子节点数组，对每个子节点进行补丁操作
  children.forEach((child) => {
    patch(null, child, container, anchor)
  })
}

/**
 * 更新组件虚拟节点
 * @param preVnode - 旧的组件虚拟节点
 * @param newVnode - 新的组件虚拟节点
 */
function updateComponent(preVnode: ComponentVnode, newVnode: ComponentVnode) {
  // 将旧组件实例赋值给新虚拟节点
  newVnode.component = preVnode.component
  // 设置新虚拟节点为组件的下一个更新节点
  newVnode.component.next = newVnode
  // 调用组件的更新方法
  newVnode.component.update()
}

/**
 * 卸载虚拟节点
 * @param vnode - 要卸载的虚拟节点
 */
function unmount(vnode: TypeVnode) {
  const { shapeFlag, el } = vnode
  if (shapeFlag & ShapeFlags.COMPONENT) {
    // 如果是组件节点，则卸载组件
    unmountComponent(vnode as ComponentVnode)
  } else if (shapeFlag & ShapeFlags.FRAGMENT) {
    // 如果是片段节点，则卸载片段
    unmountFragment(vnode as FragmentVnode)
  } else {
    // 否则，直接从 DOM 中移除节点
    el.parentNode.removeChild(el)
  }
}

/**
 * 卸载组件虚拟节点
 * @param vnode - 要卸载的组件虚拟节点
 */
function unmountComponent(vnode: ComponentVnode) {
  // 递归卸载组件的子树
  unmount(vnode.component.subTree)
}

/**
 * 卸载片段虚拟节点
 * @param vnode - 要卸载的片段虚拟节点
 */
function unmountFragment(vnode: FragmentVnode) {
  // eslint-disable-next-line prefer-const
  let { el: cur, anchor: end } = vnode
  // 循环移除片段内的所有节点
  while (cur !== end) {
    const next = (cur as any).nextSibling
    cur.parentNode.removeChild(cur)
    cur = next
  }
  // 移除片段的结束锚点
  end.parentNode.removeChild(end)
}

/**
 * 处理元素节点
 * @param preVnode - 旧的元素虚拟节点
 * @param newVnode - 新的元素虚拟节点
 * @param container - 渲染的目标容器
 * @param anchor - 插入节点的锚点，默认为 null
 */
function processElement(
  preVnode: ElementVnode | null,
  newVnode: ElementVnode,
  container: TElement,
  anchor: TElement | ChildVnode | null = null
) {
  if (!preVnode) {
    // 如果旧节点不存在，则挂载新节点
    mountElement(newVnode, container, anchor)
  } else {
    // 否则，对新旧节点进行补丁操作
    patchElement(preVnode, newVnode)
  }
}

/**
 * 处理片段节点
 * @param preVnode - 旧的片段虚拟节点
 * @param newVnode - 新的片段虚拟节点
 * @param container - 渲染的目标容器
 * @param anchor - 插入节点的锚点，默认为 null
 */
function processFragment(
  preVnode: FragmentVnode | null | undefined,
  newVnode: FragmentVnode,
  container: TElement,
  anchor: TElement | ChildVnode | null = null
) {
  // 设置片段的开始和结束锚点
  const fragmentStartAnchor = (newVnode.el = preVnode
    ? preVnode.el
    : document.createTextNode(''))
  const fragmentEndAnchor = (newVnode.anchor = preVnode
    ? preVnode.anchor
    : document.createTextNode(''))
  if (!preVnode) {
    // 如果旧节点不存在，则插入锚点并挂载子节点
    container.insertBefore(fragmentStartAnchor, anchor)
    container.insertBefore(fragmentEndAnchor, anchor)
    mountChildren(
      newVnode.children as TypeVnode[],
      container,
      fragmentEndAnchor
    )
  } else {
    // 否则，对新旧节点的子节点进行补丁操作
    patchChildren(preVnode, newVnode, container, fragmentEndAnchor)
  }
}

/**
 * 处理文本节点
 * @param preVnode - 旧的文本虚拟节点
 * @param newVnode - 新的文本虚拟节点
 * @param container - 渲染的目标容器
 * @param anchor - 插入节点的锚点，默认为 null
 */
function processText(
  preVnode: TextVnode,
  newVnode: TextVnode,
  container: TElement,
  anchor: TElement | ChildVnode | null = null
) {
  if (!preVnode) {
    // 如果旧节点不存在，则挂载新节点
    mountTextNode(newVnode, container, anchor)
  } else {
    // 否则，更新文本节点的内容
    newVnode.el = preVnode.el
    newVnode.el.textContent = newVnode.children
  }
}

/**
 * 处理组件节点
 * @param preVnode - 旧的组件虚拟节点
 * @param newVnode - 新的组件虚拟节点
 * @param container - 渲染的目标容器
 * @param anchor - 插入节点的锚点，默认为 null
 */
function processComponent(
  preVnode: any,
  newVnode: any,
  container: TElement,
  anchor: TElement | ChildVnode | null = null
) {
  if (!preVnode) {
    // 如果旧节点不存在，则挂载新组件
    mountComponent(newVnode, container, anchor)
  } else {
    // 否则，更新组件
    updateComponent(preVnode, newVnode)
  }
}

/**
 * 对元素节点进行补丁操作
 * @param preVnode - 旧的元素虚拟节点
 * @param newVnode - 新的元素虚拟节点
 */
function patchElement(preVnode: ElementVnode, newVnode: ElementVnode) {
  // 将旧节点的 DOM 元素赋值给新节点
  newVnode.el = preVnode.el
  // 更新 DOM 元素的属性
  patchProps(preVnode.props, newVnode.props, newVnode.el)
  // 对新旧节点的子节点进行补丁操作
  patchChildren(preVnode, newVnode, newVnode.el)
}

/**
 * 对新旧节点的子节点进行补丁操作
 * @param preVnode - 旧的虚拟节点
 * @param newVnode - 新的虚拟节点
 * @param container - 渲染的目标容器
 * @param anchor - 插入节点的锚点，默认为 null
 */
function patchChildren(
  preVnode: ElementVnode | ComponentVnode | FragmentVnode,
  newVnode: ElementVnode | ComponentVnode | FragmentVnode,
  container: TElement,
  anchor: TElement | ChildVnode | null = null
) {
  const { shapeFlag: prevShapeFlag, children: oldChildren } = preVnode
  const { shapeFlag: newShapFlag, children: newChildren } = newVnode

  if (newShapFlag & ShapeFlags.TEXT_CHILDREN) {
    if (prevShapeFlag & ShapeFlags.ARRAY_CHILDREN) {
      // 如果新节点是文本子节点，旧节点是数组子节点，则卸载旧子节点
      unmountChildren(oldChildren as TypeVnode[])
    }
    if (newChildren !== oldChildren) {
      // 如果新旧子节点内容不同，则更新容器的文本内容
      container.textContent = newChildren as string
    }
  } else if (newShapFlag & ShapeFlags.ARRAY_CHILDREN) {
    if (prevShapeFlag & ShapeFlags.ARRAY_CHILDREN) {
      if (
        (oldChildren as TypeVnode[])[0] &&
        (oldChildren as TypeVnode[])[0].key &&
        (newChildren as TypeVnode[])[0] &&
        (newChildren as TypeVnode[])[0].key
      ) {
        // 如果新旧节点都有带 key 的数组子节点，则进行带 key 的子节点补丁操作
        patchKeyedChildren(
          oldChildren as TypeVnode[],
          newChildren as TypeVnode[],
          container,
          anchor
        )
      } else {
        // 否则，进行不带 key 的子节点补丁操作
        patchUnkeyedChildren(
          oldChildren as TypeVnode[],
          newChildren as TypeVnode[],
          container,
          anchor
        )
      }
    } else {
      // 如果旧节点不是数组子节点，则清空容器并挂载新子节点
      container.textContent = ''
      mountChildren(newChildren as TypeVnode[], container, anchor)
    }
  } else {
    if (prevShapeFlag & ShapeFlags.ARRAY_CHILDREN) {
      // 如果新节点没有子节点，旧节点是数组子节点，则卸载旧子节点
      unmountChildren(newChildren as TypeVnode[])
    }
    // 清空容器的文本内容
    container.textContent = ''
  }
}

/**
 * 卸载多个子节点
 * @param children - 要卸载的子节点数组
 */
function unmountChildren(children: TypeVnode[]) {
  // 遍历子节点数组，对每个子节点进行卸载操作
  children.forEach((child) => unmount(child))
}

/**
 * 对不带 key 的子节点进行补丁操作
 * @param oldChildren - 旧的子节点数组
 * @param newChildren - 新的子节点数组
 * @param container - 渲染的目标容器
 * @param anchor - 插入节点的锚点，默认为 null
 */
function patchUnkeyedChildren(
  oldChildren: TypeVnode[],
  newChildren: TypeVnode[],
  container: TElement,
  anchor: TElement | ChildVnode | null = null
) {
  const oldLength = oldChildren.length
  const newLength = newChildren.length
  const commonLength = Math.min(oldLength, newLength)
  // 对相同位置的子节点进行补丁操作
  for (let i = 0; i < commonLength; i++) {
    patch(oldChildren[i], newChildren[i], container, anchor)
  }
  if (oldLength > newLength) {
    // 如果旧子节点数量多于新子节点，则卸载多余的旧子节点
    unmountChildren(oldChildren.slice(commonLength))
  } else if (oldLength < newLength) {
    // 如果旧子节点数量少于新子节点，则挂载多余的新子节点
    mountChildren(newChildren.slice(commonLength), container, anchor)
  }
}

/**
 * 对带 key 的子节点进行补丁操作
 * @param oldChildren - 旧的子节点数组
 * @param newChildren - 新的子节点数组
 * @param container - 渲染的目标容器
 * @param anchor - 插入节点的锚点，默认为 null
 */
function patchKeyedChildren(
  oldChildren: TypeVnode[],
  newChildren: TypeVnode[],
  container: TElement,
  anchor: TElement | ChildVnode | null = null
) {
  let j = 0
  let oldNode = oldChildren[j]
  let newNode = newChildren[j]
  let oldEnd = oldChildren.length - 1
  let newEnd = newChildren.length - 1

  // 从头部开始比较相同 key 的节点并进行补丁操作
  while (oldNode.key === newNode?.key) {
    patch(oldNode, newNode, container, anchor)
    j++
    oldNode = oldChildren[j]
    newNode = newChildren[j]
  }

  oldNode = oldChildren[oldEnd]
  newNode = newChildren[newEnd]

  // 从尾部开始比较相同 key 的节点并进行补丁操作
  while (oldNode.key === newNode.key) {
    patch(oldNode, newNode, container, anchor)
    oldEnd--
    newEnd--
    oldNode = oldChildren[oldEnd]
    newNode = newChildren[newEnd]
  }

  if (j <= newEnd && j > oldEnd) {
    // 如果新节点有剩余，则挂载剩余的新节点
    const anchorIndex = newEnd + 1
    const anchor =
      anchorIndex < newChildren.length ? newChildren[anchorIndex].el : null
    while (j <= newEnd) {
      patch(null, newChildren[j++], container, anchor)
    }
  } else if (j > newEnd && j <= oldEnd) {
    // 如果旧节点有剩余，则卸载剩余的旧节点
    while (j <= oldEnd) {
      unmount(oldChildren[j++])
    }
  } else {
    const count = newEnd - j + 1
    // 初始化一个数组，用于记录新节点在旧节点中的位置
    const souce = new Array(count)
    souce.fill(-1)
    let patched = 0
    let pos = 0
    let moved = false

    const keyIndex = {}
    // 构建新节点 key 到索引的映射
    for (let i = j; i <= newEnd; i++) {
      keyIndex[newChildren[i].key] = i
    }
    for (let i = j; i <= oldEnd; i++) {
      oldNode = oldChildren[i]
      if (patched < count) {
        const k = keyIndex[oldNode.key]

        if (typeof k !== 'undefined') {
          newNode = newChildren[k]
          // 对相同 key 的节点进行补丁操作
          patch(oldNode, newNode, container, anchor)
          patched++
          souce[k - j] = i
          if (k < pos) {
            moved = true
          } else {
            pos = k
          }
        } else {
          // 如果旧节点在新节点中不存在，则卸载旧节点
          unmount(oldNode)
        }
      } else {
        // 如果已经处理完所有新节点，则卸载剩余的旧节点
        unmount(oldNode)
      }
    }
    if (moved) {
      // 如果节点需要移动，则获取最长递增子序列
      const seq = getSequence(souce)

      let s = seq.length - 1
      let i = count - 1

      for (i; i >= 0; i--) {
        if (souce[i] === -1) {
          // 如果新节点在旧节点中不存在，则挂载新节点
          const pos = i + j
          newNode = newChildren[pos]
          const nextPos = pos + 1
          const anchor = nextPos < newChildren.length ? newChildren[nextPos].el : null
          patch(null, newNode, container, anchor)
        } else if (i !== seq[s]) {
          // 如果节点需要移动，则插入到正确位置
          const pos = i + j
          newNode = newChildren[pos]
          const nextPos = pos + 1
          const anchor = nextPos < newChildren.length ? newChildren[nextPos].el : null
          container.insertBefore(newNode.el, anchor)
        } else {
          s--
        }
      }
    }
  }
}

/**
 * 获取数组的最长递增子序列的索引
 * @param nums - 输入的数组
 * @returns 最长递增子序列的索引数组
 */
function getSequence(nums: any[]) {
  const result = []
  const position = []
  for (let i = 0; i < nums.length; i++) {
    if (nums[i] === -1) {
      // 跳过值为 -1 的元素
      continue
    }

    if (nums[i] > result[result.length - 1]) {
      // 如果当前元素大于结果数组的最后一个元素，则添加到结果数组中
      result.push(nums[i])
      position.push(result.length - 1)
    } else {
      let l = 0,
        r = result.length - 1
      // 二分查找插入位置
      while (l <= r) {
        const mid = ~~((l + r) / 2)
        if (nums[i] > result[mid]) {
          l = mid + 1
        } else if (nums[i] < result[mid]) {
          r = mid - 1
        } else {
          l = mid
          break
        }
      }
      result[l] = nums[i]
      position.push(l)
    }
  }
  let cur = result.length - 1

  // 回溯获取最长递增子序列的索引
  for (let i = position.length - 1; i >= 0 && cur >= 0; i--) {
    if (position[i] === cur) {
      result[cur--] = i
    }
  }
  return result
}
