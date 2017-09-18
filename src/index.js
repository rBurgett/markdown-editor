import React, { Component } from 'react';
import ReactDOM from 'react-dom';

class MarkdownEditor extends Component {

    render() {
        return (
            <h1>Markdown Editor!</h1>
        );
    }

}

ReactDOM.render(
    <MarkdownEditor />,
    document.getElementById('js-main')
);
