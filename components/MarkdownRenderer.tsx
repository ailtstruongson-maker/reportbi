import React from 'react';

interface MarkdownRendererProps {
  content: string;
}

const MarkdownRenderer: React.FC<MarkdownRendererProps> = ({ content }) => {
  const lines = content.split('\n');
  const elements: React.ReactNode[] = [];
  let listItems: string[] = [];

  const renderList = () => {
    if (listItems.length > 0) {
      elements.push(
        <ul key={`ul-${elements.length}`} className="list-disc pl-6 my-2 space-y-1">
          {listItems.map((item, index) => (
            <li key={`li-${index}`} dangerouslySetInnerHTML={{ __html: item }} />
          ))}
        </ul>
      );
      listItems = [];
    }
  };

  lines.forEach((line, index) => {
    // Process bold text
    line = line.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');

    // Handle headings
    if (line.startsWith('### ')) {
      renderList();
      elements.push(<h4 key={index} className="text-md font-semibold text-slate-700 dark:text-slate-300 mt-4 mb-2" dangerouslySetInnerHTML={{ __html: line.substring(4) }} />);
    } else if (line.startsWith('## ')) {
        renderList();
        elements.push(<h3 key={index} className="text-lg font-bold text-slate-800 dark:text-slate-200 mt-5 mb-2" dangerouslySetInnerHTML={{ __html: line.substring(3) }} />);
    } else if (line.startsWith('# ')) {
        renderList();
        elements.push(<h2 key={index} className="text-xl font-extrabold text-primary-700 dark:text-primary-400 mt-6 mb-3" dangerouslySetInnerHTML={{ __html: line.substring(2) }} />);
    }
    // Handle list items (support both * and -)
    else if (line.match(/^(\*|-)\s/)) {
      listItems.push(line.substring(2));
    } else {
      renderList();
      if (line.trim() !== '') {
        elements.push(<p key={index} className="my-2" dangerouslySetInnerHTML={{ __html: line }} />);
      }
    }
  });

  renderList(); // Render any remaining list items

  return <div className="prose prose-sm max-w-none text-slate-600 dark:text-slate-300 leading-relaxed dark:prose-strong:text-slate-100">{elements}</div>;
};

export default MarkdownRenderer;