
const VNodeType = {
  // 组件待扩展
  HTML:'HTML',
  TEXT:'TEXT',
}
let ChildTyps = {
  EMPTY:'EMPTY',
  SINGLE:'SINGLE',
  MULTIPLE:'MULTIPLE'
}

function createElement(tag, data = null, children = null) {
  // 确定 flags
  let flags
  if (typeof tag === 'string') {
    flags = VNodeType.HTML
  }  else if(typeof tag === 'function'){
    // 组件 未完待续
    flags = VNodeType.COMPONENT
  } else{
    flags = VNodeType.TEXT
  }
  // 确定 childFlags
  let childFlags = null
  if (Array.isArray(children)) {
    const { length } = children
    if (length === 0) {
      // 没有 children
      childFlags = ChildTyps.EMPTY
    } else {
      // 多个子节点，且子节点使用key
      childFlags = ChildTyps.MULTIPLE
    }
  } else if (children == null) {
    // 没有子节点
    childFlags = ChildTyps.EMPTY
  } else {
    // 其他情况都作为文本节点处理，即单个子节点，会调用 createTextVNode 创建纯文本类型的 VNode
    childFlags = ChildTyps.SINGLE
    children = createTextVNode(children + '')
  }

  // 返回 VNode 对象
  return {
    flags,
    tag,
    data,
    key: data && data.key,
    children,
    childFlags,
    el: null
  }
}

function createTextVNode(text) {
  return {
    // flags 是 VNodeType.TEXT
    flags: VNodeType.TEXT,
    tag: null,
    data: null,
    // 纯文本类型的 VNode，其 children 属性存储的是与之相符的文本内容
    children: text,
    // 文本节点没有子节点
    childFlags: ChildTyps.EMPTY
  }
}
// 更新data
function patchData(el, key, prevValue, nextValue) {
  switch (key) {
    case 'style':
      for (let k in nextValue) {
        el.style[k] = nextValue[k]
      }
      for (let k in prevValue) {
        if (!nextValue.hasOwnProperty(k)) {
          el.style[k] = ''
        }
      }
      break
    case 'class':
      el.className = nextValue
      break
    default:
      if (key[0] === '@') {
        // 事件
        // 移除旧事件
        if (prevValue) {
          el.removeEventListener(key.slice(1), prevValue)
        }
        // 添加新事件
        if (nextValue) {
          el.addEventListener(key.slice(1), nextValue)
        }
      } else {
        // 当做 Attr 处理
        el.setAttribute(key, nextValue)
      }
      break
  }
}


function render(vnode, container) {
  const prevVNode = container.vnode
  if (prevVNode == null) {
      // 没有旧的 VNode，使用 `mount` 函数挂载全新的 VNode
      mount(vnode, container)
      // 将新的 VNode 添加到 container.vnode 属性下，这样下一次渲染时旧的 VNode 就存在了
  } else {
      // 有旧的 VNode，则调用 `patch` 函数打补丁
      patch(prevVNode, vnode, container)
      // 更新 container.vnode
  }
  container.vnode = vnode

}

function mount(vnode, container, refNode) {
  const { flags } = vnode
  if (flags == VNodeType.HTML) {
    // 挂载普通标签
    mountElement(vnode, container, refNode)
  }else if (flags == VNodeType.TEXT) {
    // 挂载纯文本
    mountText(vnode, container)
  } 
}

function mountElement(vnode, container, refNode) {
  const el = document.createElement(vnode.tag)
  vnode.el = el
  const data = vnode.data
  if (data) {
    for (let key in data) {
      patchData(el, key, null, data[key])
    }
  }

  const childFlags = vnode.childFlags
  const children = vnode.children
  if (childFlags !== ChildTyps.EMPTY) {
    if (childFlags == ChildTyps.SINGLE) {
      mount(children, el)
    } else if (childFlags  == ChildTyps.MULTIPLE) {
      for (let i = 0; i < children.length; i++) {
        mount(children[i], el)
      }
    }
  }
  refNode ? container.insertBefore(el, refNode) : container.appendChild(el)
}

function mountText(vnode, container) {
  const el = document.createTextNode(vnode.children)
  vnode.el = el
  container.appendChild(el)
}



function patch(prevVNode, nextVNode, container) {
  const nextFlags = nextVNode.flags
  const prevFlags = prevVNode.flags

  if (prevFlags !== nextFlags) {
    // 直接替换
    replaceVNode(prevVNode, nextVNode, container)
  } else if (nextFlags == VNodeType.HTML) {
    patchElement(prevVNode, nextVNode, container)
  } else if (nextFlags == VNodeType.TEXT) {
    patchText(prevVNode, nextVNode)
  }
}

function replaceVNode(prevVNode, nextVNode, container) {
  container.removeChild(prevVNode.el)
  mount(nextVNode, container)
}

function patchElement(prevVNode, nextVNode, container) {
  // 如果新旧 VNode 描述的是不同的标签，则调用 replaceVNode 函数使用新的 VNode 替换旧的 VNode
  if (prevVNode.tag !== nextVNode.tag) {
    replaceVNode(prevVNode, nextVNode, container)
    return
  }

  // 拿到 el 元素，注意这时要让 nextVNode.el 也引用该元素
  const el = (nextVNode.el = prevVNode.el)
  const prevData = prevVNode.data
  const nextData = nextVNode.data

  if (nextData) {
    for (let key in nextData) {
      const prevValue = prevData[key]
      const nextValue = nextData[key]
      patchData(el, key, prevValue, nextValue)
    }
  }
  // 删除
  if (prevData) {
    for (let key in prevData) {
      const prevValue = prevData[key]
      if (prevValue && !nextData.hasOwnProperty(key)) {
        patchData(el, key, prevValue, null)
      }
    }
  }

  // 调用 patchChildren 函数递归的更新子节点
  patchChildren(
    prevVNode.childFlags, // 旧的 VNode 子节点的类型
    nextVNode.childFlags, // 新的 VNode 子节点的类型
    prevVNode.children, // 旧的 VNode 子节点
    nextVNode.children, // 新的 VNode 子节点
    el // 当前标签元素，即这些子节点的父节点
  )
}

function patchChildren(
  prevChildFlags,
  nextChildFlags,
  prevChildren,
  nextChildren,
  container
) {
  switch (prevChildFlags) {
    // 旧的 children 是单个子节点，会执行该 case 语句块
    case ChildTyps.SINGLE:
      switch (nextChildFlags) {
        case ChildTyps.SINGLE:
          // 新的 children 也是单个子节点时，会执行该 case 语句块
          patch(prevChildren, nextChildren, container)
          break
        case ChildTyps.EMPTY:
          // 新的 children 中没有子节点时，会执行该 case 语句块
          container.removeChild(prevChildren.el)
          break
        default:
          // 但新的 children 中有多个子节点时，会执行该 case 语句块
          container.removeChild(prevChildren.el)
          for (let i = 0; i < nextChildren.length; i++) {
            mount(nextChildren[i], container)
          }
          break
      }
      break
    // 旧的 children 中没有子节点时，会执行该 case 语句块
    case ChildTyps.EMPTY:
      switch (nextChildFlags) {
        case ChildTyps.SINGLE:
          // 新的 children 是单个子节点时，会执行该 case 语句块
          mount(nextChildren, container)
          break
        case ChildTyps.EMPTY:
          // 新的 children 中没有子节点时，会执行该 case 语句块
          break
        default:
          // 但新的 children 中有多个子节点时，会执行该 case 语句块
          for (let i = 0; i < nextChildren.length; i++) {
            mount(nextChildren[i], container)
          }
          break
      }
      break
    // 旧的 children 中有多个子节点时，会执行该 case 语句块
    default:
      switch (nextChildFlags) {
        case ChildTyps.SINGLE:
          for (let i = 0; i < prevChildren.length; i++) {
            container.removeChild(prevChildren[i].el)
          }
          mount(nextChildren, container)
          break
        case ChildTyps.EMPTY:
          for (let i = 0; i < prevChildren.length; i++) {
            container.removeChild(prevChildren[i].el)
          }
          break
        default:
          // 但新的 children 中有多个子节点时，会执行该 case 语句块
          let lastIndex = 0
          for (let i = 0; i < nextChildren.length; i++) {
            const nextVNode = nextChildren[i]
            let j = 0,
              find = false
            for (j; j < prevChildren.length; j++) {
              const prevVNode = prevChildren[j]
              if (nextVNode.key === prevVNode.key) {
                find = true
                patch(prevVNode, nextVNode, container)
                if (j < lastIndex) {
                  // 需要移动
                  const refNode = nextChildren[i - 1].el.nextSibling
                  container.insertBefore(prevVNode.el, refNode)
                  break
                } else {
                  // 更新 lastIndex
                  lastIndex = j
                }
              }
            }
            if (!find) {
              // 挂载新节点
              const refNode =
                i - 1 < 0
                  ? prevChildren[0].el
                  : nextChildren[i - 1].el.nextSibling

              mount(nextVNode, container, refNode)
            }
          }
          // 移除已经不存在的节点
          for (let i = 0; i < prevChildren.length; i++) {
            const prevVNode = prevChildren[i]
            const has = nextChildren.find(
              nextVNode => nextVNode.key === prevVNode.key
            )
            if (!has) {
              // 移除
              container.removeChild(prevVNode.el)
            }
          }
          break
      }
      break
  }
}

function patchText(prevVNode, nextVNode) {
  // 拿到文本节点 el，同时让 nextVNode.el 指向该文本节点
  const el = (nextVNode.el = prevVNode.el)
  // 只有当新旧文本内容不一致时才有必要更新
  if (nextVNode.children !== prevVNode.children) {
    el.nodeValue = nextVNode.children
  }
}

