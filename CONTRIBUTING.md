# Contributing to GitHub User Analyzer

First off, thank you for considering contributing to GitHub User Analyzer! It's people like you that make this such a great tool.

## Code of Conduct

This project and everyone participating in it is governed by our Code of Conduct. By participating, you are expected to uphold this code.

## How Can I Contribute?

### Reporting Bugs

Before creating bug reports, please check the issue list as you might find out that you don't need to create one. When you are creating a bug report, please include as many details as possible:

- **Use a clear and descriptive title**
- **Describe the exact steps which reproduce the problem**
- **Provide specific examples to demonstrate the steps**
- **Describe the behavior you observed after following the steps**
- **Explain which behavior you expected to see instead and why**
- **Include screenshots and animated GIFs if possible**
- **Include your environment details** (OS, Node.js version, browser, etc.)

### Suggesting Enhancements

Enhancement suggestions are tracked as GitHub issues. When creating an enhancement suggestion, please include:

- **Use a clear and descriptive title**
- **Provide a step-by-step description of the suggested enhancement**
- **Provide specific examples to demonstrate the steps**
- **Describe the current behavior and expected behavior**
- **Explain why this enhancement would be useful**

### Pull Requests

- Fill in the required template
- Follow the styleguides
- End all files with a newline
- Include appropriate test cases

## Development Setup

1. Fork the repo and clone it locally:
```bash
git clone https://github.com/YOUR-USERNAME/github-user-analyzer.git
cd github-user-analyzer
```

2. Install dependencies:
```bash
npm install
```

3. Create a new branch:
```bash
git checkout -b feature/your-feature-name
```

4. Start the dev server:
```bash
npm run dev
```

5. Make your changes and test thoroughly

6. Commit with a clear message:
```bash
git commit -m "Add brief description of changes"
```

7. Push to your fork:
```bash
git push origin feature/your-feature-name
```

8. Create a Pull Request on GitHub

## Styleguides

### Git Commit Messages

- Use the present tense ("Add feature" not "Added feature")
- Use the imperative mood ("Move cursor to..." not "Moves cursor to...")
- Limit the first line to 72 characters or less
- Reference issues and pull requests liberally after the first line

### TypeScript/JavaScript

- Use TypeScript for type safety
- Follow existing code style
- Use meaningful variable names
- Add comments for complex logic
- Format code with proper indentation

### Component Guidelines

- Create new components in the `components/` folder
- Use `.tsx` extension for React components
- Export components as default exports
- Document component props with TypeScript interfaces

## Additional Notes

### Issue and Pull Request Labels

- **bug**: Something isn't working
- **enhancement**: New feature or request
- **documentation**: Improvements or additions to documentation
- **good first issue**: Good for newcomers
- **help wanted**: Extra attention is needed

## Community

- Join discussions on GitHub Issues
- Comment on pull requests to help review
- Share ideas and feedback

Thank you for contributing! 🎉
