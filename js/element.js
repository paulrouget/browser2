define((require, exports, module) => {
  "use strict";

  const React = require("react")

  const isPreMountHook = field => field && field.mount
  exports.isPreMountHook = isPreMountHook

  const isPostMountHook = field => field && field.mounted
  exports.isPostMountHook = isPostMountHook

  const isUpdateHook = field => field && field.write
  exports.isUpdateHook = isUpdateHook

  const isConstractorHook = field => field && field.construct
  exports.isConstractorHook = isConstractorHook

  const Element = (name, fields={}) => {
    // In react you can actually define custom HTML element it's
    // just set of attributes you'll be able to set will be limited
    // to React's white list. To workaround that we define React
    // custom HTML element factory & custom react component that
    // will render that HTML element via custom factory.
    const Node = React.createFactory(name)
    const keys = Object.keys(fields)
    const mountHooks = keys.filter(key => isPreMountHook(fields[key]))
    const mountedHooks = keys.filter(key => isPostMountHook(fields[key]))
    const updateHooks = keys.filter(key => isUpdateHook(fields[key]))
    const constractorHooks = keys.filter(key => isConstractorHook(fields[key]))


    // React component is a wrapper around the our custom HTML Node
    // who's whole purpose is to update attributes of the node that
    // are not recognized by react.
    const Type = React.createClass({
      displayName: `html:${name}`,
      getInitialState() {
        const state = Object.assign({}, fields)
        constractorHooks.forEach(key => {
          state[key] = fields[key].construct()
        })
        return state
      },
      // Reflect attributes not recognized by react.
      componentDidMount() {
        const node = this.getDOMNode()
        const present = this.props
        const hooks = this.state

        if (mountHooks.length > 0) {
          mountHooks.forEach(name => {
            const hook = hooks[name]
            const value = present[name]
            hook.mount(node, value)
          })

          // Pre mount fields need to be set before node
          // is in the document. Since react does not has
          // an appropriate hook we replace node with itself
          // to trigger desired behavior.
          node.parentNode.replaceChild(node, node)
        }

        mountedHooks.forEach(name => {
          const hook = hooks[name]
          hook.mounted(node, present[name])
        })
      },
      // Reflect attribute changes not recognized by react.
      componentDidUpdate(past) {
        const node = this.getDOMNode()
        const present = this.props
        const hooks = this.state

        updateHooks.forEach(name => {
          const hook = hooks[name]
          hook.write(node, present[name], past[name])
        })
      },
      // Render renders wrapped HTML node.
      render() {
        return Node(this.props, this.props.children)
      }
    })
    return React.createFactory(Type)
  }
  exports.Element = Element

  // Option can be used to define attribute on the element
  // that is set once before element is inserted into a
  // document (mounted). Changes to this option are ignored
  // & in general use of `Attribute` is preferred, this should
  // be reserved only for attributes changes to which aren't picked
  // up after node is in the tree.
  // Example: Element("iframe", { browser: Option("mozbrowser") })
  const Option = function(name) {
    if (!(this instanceof Option)) {
      return new Option(name)
    }

    this.name = name
  }
  // 6 3/8
  Option.prototype = {
    constructor: Option,
    mount(node, value) {
      node.setAttribute(this.name, value)
    }
  }
  Element.Option = Option
  exports.Option = Option

  // Attribute can be used to define field mapped to a
  // DOM attribute with a given `name`. If the field is
  // set to `undefined` or `null` attribute is removed
  // othrewise it's set to given value.
  // Example: Element("hbox", {flex: Attribute("flex")})
  const Attribute = function(name) {
    if (!(this instanceof Attribute)) {
      return new Attribute(name)
    }

    this.name = name
  }
  Attribute.prototype = {
    constructor: Attribute,
    mounted(node, value) {
      if (value != void(0)) {
        node.setAttribute(this.name, value)
      }
    },
    write(node, present, past) {
      if (present != past) {
        if (present == void(0)) {
          node.removeAttribute(this.name)
        }
        else {
          node.setAttribute(this.name, present)
        }
      }
    }
  }
  Element.Attribute = Attribute
  exports.Attribute = Attribute

  // Field can be used to define fields that can't be
  // mapped to an attribute in the DOM. Field is defined
  // by providing a function that will be invoked target
  // `node` `current` value & `past` value and it's supposed
  // to reflect changes in the DOM. Note that on initial
  // render `past` will be `void(0)`.
  //
  // Example:
  // Element("iframe", {focused: (node, current, past) => {
  //   if (current) {
  //     node.focus()
  //   }
  // }})
  const Field = function(write) {
    if (!(this instanceof Field)) {
      return new Field(write)
    }
    this.write = write
  }
  Field.prototype = {
    constructor: Attribute,
    mounted(node, value) {
      this.write(node, value, void(0))
    }
  }
  Element.Field = Field
  exports.Field = Field

  // Event can be used to define event handler fields, for
  // the given event `type`. When event of that type occurs
  // event handler assigned to the associated field will be
  // invoked. Optionally `read` function can be passed as a
  // second argument, in which case event handler will be
  // invoked with `read(event)` instead of `event`.
  // Example:
  // Element("iframe", {onTitleChange: Event("mozbrowsertitlechange")})
  const Event = function(type, read, capture=false) {
    if (!(this instanceof Event)) {
      return new Event(type, read)
    }
    this.type = type
    this.read = read
    this.capture = capture
  }
  Event.prototype = {
    constructor: Event,
    construct() {
      return new this.constructor(this.type, this.read, this.capture)
    },
    capture: false,
    mounted(node, handler) {
      this.handler = handler
      node.addEventListener(this.type, this, this.capture)
    },
    write(node, present) {
      this.handler = present
    },
    handleEvent(event) {
      if (this.handler) {
        this.handler(this.read ? this.read(event) : event)
      }
    }
  }
  Element.Event = Event
  exports.Event = Event

  // CapturedEvent can be used same as `Event` with a difference
  // that events listeners will be added with a capture `true`.
  const CapturedEvent = function(type, read) {
    if (!(this instanceof CapturedEvent)) {
      return new Event(type, read)
    }

    this.type = type
    this.read = read
    this.capture = true
  }
  CapturedEvent.prototype = Event.prototype
  Element.CapturedEvent = CapturedEvent
  exports.CapturedEvent = CapturedEvent
})
