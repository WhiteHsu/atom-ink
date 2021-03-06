'use babel';
/** @jsx etch.dom */

import etch from 'etch';
import { prewalk, postwalk, prefor } from './tree.js';
import { Etch, Tip } from '../util/etch.js';

function clamp (x, min, max) {
  return Math.min(Math.max(x, min), max)
}

function maprange([x1, x2], [y1, y2], x) {
  return (x-x1)/(x2-x1)*(y2-y1)+y1;
}

function dims(tree) {
  [tree.height, tree.width] = [1, 1];
  [tree.top, tree.left] = [0, 0];
  prewalk(tree, (parent) => {
    let left = parent.left;
    parent.children.forEach(ch => {
      ch.width = ch.count / parent.count * parent.width;
      ch.height = maprange([0,1],[1/5,1],ch.count/parent.count)*parent.height;
      ch.left = left;
      ch.top = parent.top + parent.height;
      left += ch.width;
    });
    // Centre align children
    chwidth = parent.children.map(({width})=>width).reduce((a,b)=>a+b, 0);
    parent.children.forEach(ch => ch.left += (parent.width-chwidth)/2);
    return parent;
  });
  // Scale total height to 100%
  let max = postwalk(tree, ({height, children}) =>
    Math.max(height, ...children.map(x=>x+height)));
  prewalk(tree, (node) => {
    node.top /= max;
    node.height /= max;
    return node;
  });
  return tree;
}

class Clickable extends Etch {
  hypot([x1, x2], [y1, y2]) {
    return Math.sqrt(Math.pow(y1-x1,2)+Math.pow(y2-x2,2));
  }
  onclick(e) {
    if (!this.clickStart) return;
    if (this.hypot(this.clickStart, [e.clientX, e.clientY]) < 5)
      this.props.onclick(e);
    this.clickStart = null;
  }
  render() {
    return <span onmousedown={e=>this.clickStart=[e.clientX,e.clientY]}
                 onclick={e=>this.onclick(e)}
                 onmouseleave={e=>this.clickStart=null}>{
      this.children
    }</span>;
  }
}

class Pannable extends Etch {
  top = 0;
  left = 0;

  ondrag({movementX, movementY}) {
    if (!this.dragging) return;

    this.left += movementX
    this.top += movementY
    this.update();
  }

  zoom(e) {
    const zoom = Math.pow(0.99, e.deltaY)

    if (zoom*this.scale > 50 || zoom*this.scale < 0.1) return

    if (this.containerRect) {
      const mouseX = clamp(e.clientX - this.containerRect.left, 0, this.containerRect.width)
      const mouseY = clamp(e.clientY - this.containerRect.top, 0, this.containerRect.height)
      this.left += -(mouseX*zoom - mouseX)
      this.top += -(mouseY*zoom - mouseY)
    }
    this.scale *= zoom
    this.update();
  }

  render() {
    if (!this.scale) this.scale = 1
    const scale = this.scale*100+'%'
    
    return <div style={{height:'100%',width:'100%'}}
                onmousedown={e=>this.dragging=true}
                onmouseup={e=>this.dragging=false}
                onmouseleave={e=>this.dragging=false}
                onmousemove={e=>this.ondrag(e)}
                onmousewheel={e=>this.zoom(e)}>
      <div style={{transform: 'translate('+this.left+'px,'+this.top+'px)',
                   height:scale, width:scale,
                   position:'relative'}}
           className='ink-canopy-container'>
        {this.children}
      </div>
    </div>;
  }

  readAfterUpdate () {
    this.containerRect =
      this.element.getElementsByClassName('ink-canopy-container')[0].getBoundingClientRect()
  }
}

class NodeView extends Etch {
  render() {
    let {height, width, top, left, onclick, onmouseover, onmouseout} = this.props;
    return <Clickable onclick={onclick}><div className='node' {...{onmouseover, onmouseout}} style={{
      height: 100*height+'%',
      width:  100*width +'%',
      top:    100*top   +'%',
      left:   100*left  +'%'
    }}>
      <div><div></div></div>
    </div></Clickable>;
  }
}

export default class Canopy extends Etch {
  update({data}) {}
  render() {
    let nodes = [];
    prefor(dims(this.props.data), node => nodes.push(<NodeView {...node} />));
    return <div className="ink-canopy"><Pannable>
      {nodes}
    </Pannable></div>;
  }
}
