export default {
  tagNames: ['h1', 'h2', 'h3', 'p', 'ul', 'ol', 'li', 'code', 'pre', 'blockquote', 'table'],
  attributes: {
    '*': ['className'],
    a: ['href', 'title'],
    img: ['src', 'alt']
  },
  protocols: {
    href: ['http', 'https', 'mailto']
  }
};