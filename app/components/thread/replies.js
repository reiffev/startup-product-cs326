import React from 'react';
import {getFullThreadData} from '../../server';
import { unixTimeToString } from '../../util';

export default class Replies extends React.Component {
  constructor(props){
    super(props);
    this.state = {

     };
  }

  refresh(props) {
    console.log(this.props);
    console.log(this.state);
    getFullThreadData(props.threadId, (threadData) =>{
      this.setState(threadData);
      this.setState({ contents: threadData });
    });
  }

  componentDidMount() {
    //console.log(this.props);
    this.refresh(this.props);
    //console.log(this.props);
  }
  componentWillReceiveProps(nextProps){
    this.refresh(nextProps);
}

makeTextArea(e){
  e.preventDefault();
  return(
    <div>
    <br />
    <textarea className="reply-box" rows="2" placeholder={'Reply to this post'}  />
    <button type="button" className="btn btn-primary rep-btn"> Submit </button>
    </div>
  )
}

  render() {
     var data = this.props.data;

     return(
       <ul className="media-list reply-list">
         {data.map((reply) => {
             return (
               <li className="media" key={reply._id}>
                 <div className="media-left">
                  <img className="media-object img-rounded" src={reply.authorImage} />
                 </div>
                 <div className="media-body">

                  {reply.contents}

                  <hr />

                  <p className="reply-data">
                    Posted by {reply.authorUsername} on {unixTimeToString(reply.postDate)}
                    <button type="button" className="btn btn-primary reply-btn" onClick={(e) => this.makeTextArea(e)}> Reply </button>
                  </p>

                   <Replies data={reply.replies} />
                 </div>
              </li>
            );
          })}
       </ul>
     )
   }

}
