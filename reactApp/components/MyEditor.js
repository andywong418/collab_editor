import React from 'react';
import {Editor, EditorState, RichUtils, convertFromRaw, convertToRaw, Modifier, SelectionState} from 'draft-js';
import {Button, Icon, Row, Input, Modal} from 'react-materialize';
import axios from 'axios';
import {set} from 'immutable';
import InlineStyleControls from './InlineStyleControls';
import BlockStyleControls from './BlockStyleControls';

const styleMap = {
  RED :{
    color: 'red'
  },
  BLUE: {
    color: 'blue'
  },
  GREEN: {
    color: 'green'
  },
  SMALL: {
    fontSize: '10px'
  },
  NORMAL: {
    fontSize: '15px'
  },
  LARGE: {
    fontSize: '20px'
  },
};

class MyEditor extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      editorState: EditorState.createEmpty(),
      docId: '',
      password: '',
      title: '',
      newCollab: '',
      cursorTracker: {},
      top: null,
      left: null
    };
    console.log("socket", this.props.socket);
    this.onChange = (editorState) => {
      this.setState({editorState});
      var selection = window.getSelection();
      let data;
      //only emit a cursor event if it took place in the editor (dont emit an event where user has clicked somewhere out of the screen)
      const windowSelection = window.getSelection();
      if(windowSelection.rangeCount>0){
        // console.log('window selection rangecount >0');
        const range = windowSelection.getRangeAt(0);
        const clientRects = range.getClientRects();
        if(clientRects.length > 0) {
          // console.log('client rects >0');
          const rects = clientRects[0];//cursor wil always be a single range so u can just ge tthe first range in the array
          const loc = {top: rects.top, left: rects.left};
          data = {incomingSelectionObj: selection, loc};

          // console.log('about to emit cursor movement ');
          //
          // this.setState({editorState: originalEditorState, top, left, height: bottom - top})
        }
        // this.socket.emit('cursorMove', selection)
      }


      this.props.socket.emit('change doc', {
        content: JSON.stringify(convertToRaw(editorState.getCurrentContent())),
        room: this.state.docId,
        socketId: this.props.socket.id,
        data
      });
    };
    this.focus = () => this.domEditor.focus();
    this._toggleInlineStyle = this._toggleInlineStyle.bind(this);
    this._toggleBlockStyle = this._toggleBlockStyle.bind(this);
    this.setDomEditorRef = ref => this.domEditor = ref;
    this.handleInputChange = this.handleInputChange.bind(this);
    this.saveDoc = this.saveDoc.bind(this);
    this.saveModal = this.saveModal.bind(this);
    this.addCollab = this.addCollab.bind(this);
    this.props.socket.on('change doc', contents => {
      /* console.log("CONTENTS", contents); */
      // console.log("contents", contents);
      console.log('contents', contents);
      this.setState({top: contents.data.loc.top, left: contents.data.loc.left});
      // set properties for selection highlighting
      /* console.log("new contentState", newContentState); */


      // newContentState = Modifier.applyInlineStyle(newContentState, newSelectionState, 'BLUE');

      /* console.log("even newer contentState", newContentState); */
      // console.log("even newer selectionState", newSelectionState);

      this.setState({editorState: EditorState.createWithContent(convertFromRaw(JSON.parse(contents.content)))});

    });
  }

  componentDidMount() {
    this.domEditor.focus();
    if (this.props.docId) {
      this.setState({docId: this.props.docId});
      this.getDoc();
    }
  }


  getDoc() {
    axios.get('http://localhost:3000/doc/' + this.props.docId)
    .then(resp => {
      const parsed = JSON.parse(resp.data.doc.contents);
      const newEditorState = convertFromRaw(parsed);
      console.log('convertFromRaw', newEditorState);
      this.setState({
        title: resp.data.doc.title,
        editorState: EditorState.createWithContent(newEditorState),
      });
    })
    .catch(err => {
      console.log('Error getting docs:', err);
    });
  }

  handleInputChange(event) {
    const target = event.target;
    var value = target.type === 'checkbox' ? target.checked : target.value;
    const name = target.name;
    this.setState({
      [name]: value
    });
  }

  saveDoc() {
    if (!this.state.docId) {
      $('#saveModal').modal('open');
    }
    else {
      axios.put('http://localhost:3000/doc/' + this.state.docId, {
        contents: JSON.stringify(convertToRaw(this.state.editorState.getCurrentContent())),
        title: this.state.title,
      })
      .then(resp => {
        console.log('convertToRaw', convertToRaw(this.state.editorState.getCurrentContent()));
      })
      .catch(err => {
        console.log(err);
      });
    }
  }

  saveModal() {
    axios.post('http://localhost:3000/doc/new', {
      password: this.state.password,
      title: this.state.title,
      contents: JSON.stringify(convertToRaw(this.state.editorState.getCurrentContent())),
    })
    .then(resp => {
      console.log(resp);
      this.setState({docId: resp.data.doc._id});
      $('#saveModal').modal('close');
    })
    .catch(err => {
      console.log(err);
    });
  }

  _toggleBlockStyle(blockType) {
    this.onChange(
            RichUtils.toggleBlockType(
              this.state.editorState,
              blockType
            )
    );
  }

  _toggleInlineStyle(inlineStyle) {
    this.onChange(
      RichUtils.toggleInlineStyle(
        this.state.editorState,
        inlineStyle
      )
    );
  }

  addCollab() {
    axios.post('http://localhost:3000/' + 'addCollab', {
      docId: this.state.docId,
      newCollab: this.state.newCollab,
    })
    .then(resp => {
      console.log('addCollab request sent', resp.data);
      if (resp.data.addedCollab) { $('#collabModal').modal('close'); }
    })
    .catch(resp => { console.log(resp); });
  }


  render() {
    let className = 'RichEditor-editor';
    const {editorState} = this.state;
    var selectionState  = editorState.getSelection();
    var currentContent  = editorState.getCurrentContent();
    var anchorKey       = selectionState.getAnchorKey();
    var start           = selectionState.getStartOffset();
    var end             = selectionState.getEndOffset();
    var curContentBlock = currentContent.getBlockForKey(anchorKey);
    var selectedText    = curContentBlock.getText().slice(start, end);
    const draftjsObj = {
      selectionState,
      currentContent,
      curContentBlock,
      selectedText,
      start,
      end,
      anchorKey
    };
    /* console.log('draftjsObj', draftjsObj); */

    return (
      <div className="wrapper" style={{width: '95%'}}>

			<Modal
        id='collabModal'
				header='Add Friends'
        actions={<Button onClick={this.addCollab} waves='light' className="save-doc">invite<Icon left>group_add</Icon></Button>}
      >
				<Input onChange={this.handleInputChange} value={this.state.newCollab} name="newCollab" type="text" label="username" s={12} />
			</Modal>
			<Modal
        id='saveModal'
				header='New DocTing - please enter password'
        actions={<Button onClick={this.saveModal} waves='light' className="save-doc">Save<Icon left>save</Icon></Button>}
      >
				<Input onChange={this.handleInputChange} value={this.state.password} name="password" type="password" label="password" s={12} />
			</Modal>

      <Row className="title-row">
        <Input className="title-input" s={6} name="title" label={this.state.title ? null : "Title"} value={this.state.title} onChange={this.handleInputChange}/>
        <Button onClick={() => $('#collabModal').modal('open')} waves='light' className="save-doc">invite<Icon left>group_add</Icon></Button>
      </Row>

      <div className="RichEditor-root">

        <div className="toolbar-wrapper">
          <BlockStyleControls
            editorState={editorState}
            onToggle={this._toggleBlockStyle}
          />
          <InlineStyleControls
            editorState={editorState}
            onToggle={this._toggleInlineStyle}
          />
        </div>

        <div
          className={className}
          onClick={this.focus}
        >
          {this.state.top ? (<div style={{position: 'absolute', backgroundColor: 'blue', width: '2px', height: '15px', top: this.state.top, left: this.state.left}}></div>) : undefined}
          <Editor
            blockStyleFn={getBlockStyle}
            spellCheck={true}
            customStyleMap={styleMap}
            ref={this.setDomEditorRef}
            editorState={this.state.editorState}
            onChange={this.onChange}
          />
        </div>

      </div>

      <Button onClick={this.saveDoc} waves='light' className="save-doc">Save<Icon left>save</Icon></Button>

      </div>
    );
  }
}


const getBlockStyle = (block) => {

  switch (block.getType()) {
  case 'left':
    return 'align-left';
  case 'center':
    return 'align-center';
  case 'right':
    return 'align-right';
  default:
    return null;
  }
};
export default MyEditor;
