
let div = document.createElement('div')
let str = ''
for (let key in div){
  str += key + " "
}
console.log(str)


  
{# class App extends Component{
  render(){
    return createElement('p', {id:'article'}, ['文章'])
  }
}

function App1 (){
  return createElement('a', {href:'http://www.baidu.com'}, ['百度'])
}
let dom = createElement('div',null, [
  createElement(App),
  createElement(App1),
  createElement('ul', {id:'app'}, [
    createElement('li', {class:'item'}, ['列表 1']),
    createElement('li', {class:'item'}, ['列表 2']),
    createElement('li', {class:'item'}, ['列表 3']),
  ])
])
console.log(dom) #}