// Message.js

import React from 'react';
import DOMPurify from 'dompurify';
import parse from 'html-react-parser';

const Message = ({ message, sender, onReferenceClick }) => {
    const isUser = sender === 'user';

    const processMessage = (htmlString) => {
        return parse(DOMPurify.sanitize(htmlString), {
            replace: (domNode) => {
                if (domNode.type === 'tag' && domNode.name === 'span' && domNode.attribs['data-ref-case']) {
                    const caseId = domNode.attribs['data-ref-case'];
                    return (
                        <span 
                            onClick={() => onReferenceClick({ type: 'case', id: caseId })}
                            className="reference-badge cursor-pointer text-blue-500"
                        >
                            {domNode.children[0].data}
                        </span>
                    );
                }
                if (domNode.type === 'tag' && domNode.name === 'span' && domNode.attribs['data-ref-code']) {
                    const act = domNode.attribs['data-ref-code'];
                    const section = domNode.attribs['data-ref-section'];
                    return (
                        <span 
                            onClick={() => onReferenceClick({ type: 'code', act, section })}
                            className="reference-badge cursor-pointer text-blue-500"
                        >
                            {domNode.children[0].data}
                        </span>
                    );
                }
            },
        });
    };

    return (
        <div className={`flex ${isUser ? 'justify-end' : 'justify-start'} mb-6`}>
            <div
                className={`relative px-5 py-3 rounded-2xl shadow-lg ${isUser ? 'bg-blue-500 text-white' : 'bg-gray-50 text-gray-900'} transition-all duration-300 ease-in-out`}
                style={{ maxWidth: '85%' }}
            >
                {isUser ? (
                    <p className="text-sm leading-relaxed">{message}</p>
                ) : (
                    <div className="text-sm leading-relaxed">
                        {processMessage(message)}
                    </div>
                )}
            </div>
        </div>
    );
};

export default Message;
