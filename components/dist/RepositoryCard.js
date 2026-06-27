"use strict";
exports.__esModule = true;
var react_1 = require("react");
var languageColors_1 = require("@/lib/languageColors");
var HealthScoreBadge_1 = require("@/components/HealthScoreBadge");
function RepositoryCard(_a) {
    var repo = _a.repo, onClick = _a.onClick;
    var _b = react_1.useState(false), showActionBox = _b[0], setShowActionBox = _b[1];
    var lastUpdated = new Date(repo.updated_at).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
    });
    var langColor = languageColors_1.getLanguageColorClass(repo.language);
    return (React.createElement(React.Fragment, null,
        React.createElement("div", { className: "bg-white dark:bg-slate-700/50 border border-gray-200 dark:border-slate-600 rounded-lg p-6 hover:border-blue-500 transition-colors cursor-pointer", onClick: function () { return setShowActionBox(true); }, role: "button", tabIndex: 0, onKeyDown: function (e) {
                if ((e.key === 'Enter' || e.key === ' ') && e.target === e.currentTarget) {
                    e.preventDefault();
                    setShowActionBox(true);
                }
            } },
            React.createElement("h3", { className: "text-xl font-bold text-gray-900 dark:text-white mb-2" }, repo.name),
            repo.description && (React.createElement("p", { className: "text-gray-600 dark:text-gray-300 text-sm mb-4 line-clamp-2" }, repo.description)),
            repo.language && (React.createElement("div", { className: "mb-4 flex items-center gap-2" },
                React.createElement("div", { className: "w-3 h-3 rounded-full " + langColor }),
                React.createElement("span", { className: "text-sm text-gray-500 dark:text-gray-400" }, repo.language))),
            React.createElement("div", { className: "flex flex-wrap gap-4 text-sm text-gray-500 dark:text-gray-400" },
                React.createElement("div", { className: "flex items-center gap-1" },
                    React.createElement("svg", { className: "w-4 h-4", fill: "currentColor", viewBox: "0 0 24 24" },
                        React.createElement("path", { d: "M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2m-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z" })),
                    repo.stargazers_count),
                React.createElement("div", { className: "flex items-center gap-1" },
                    React.createElement("svg", { className: "w-4 h-4", fill: "currentColor", viewBox: "0 0 24 24" },
                        React.createElement("path", { d: "M6 2a3 3 0 0 0-3 3v12a3 3 0 0 0 3 3h12a3 3 0 0 0 3-3V5a3 3 0 0 0-3-3H6zm0 2h12a1 1 0 0 1 1 1v12a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1V5a1 1 0 0 1 1-1z" })),
                    repo.forks_count),
                typeof repo.watchers_count === 'number' && (React.createElement("div", { className: "flex items-center gap-1" },
                    React.createElement("svg", { className: "w-4 h-4", fill: "currentColor", viewBox: "0 0 24 24" },
                        React.createElement("path", { d: "M12 4.5C7 4.5 2.73 7.61 1 12c1.73 4.39 6 7.5 11 7.5s9.27-3.11 11-7.5c-1.73-4.39-6-7.5-11-7.5zm0 12.5a5 5 0 1 1 0-10 5 5 0 0 1 0 10zm0-8a3 3 0 1 0 0 6 3 3 0 0 0 0-6z" })),
                    repo.watchers_count)),
                typeof repo.open_issues_count === 'number' && (React.createElement("div", { className: "flex items-center gap-1" },
                    React.createElement("svg", { className: "w-4 h-4", fill: "currentColor", viewBox: "0 0 24 24" },
                        React.createElement("path", { d: "M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20zm0 18a8 8 0 1 1 0-16 8 8 0 0 1 0 16zm-1-13h2v6h-2zm0 8h2v2h-2z" })),
                    repo.open_issues_count)),
                React.createElement("div", { className: "ml-auto text-xs" },
                    "Updated ",
                    lastUpdated))),
        showActionBox && (React.createElement("div", { className: "fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4", onClick: function () { return setShowActionBox(false); } },
            React.createElement("div", { className: "bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-600 rounded-xl shadow-xl w-full max-w-sm p-6", onClick: function (e) { return e.stopPropagation(); } },
                React.createElement("h3", { className: "text-lg font-bold text-gray-900 dark:text-white mb-1" }, repo.name),
                repo.description && (React.createElement("p", { className: "text-sm text-gray-500 dark:text-gray-400 mb-5 line-clamp-2" }, repo.description)),
                React.createElement("div", { className: "flex flex-col gap-3" },
                    React.createElement("button", { type: "button", onClick: function () { setShowActionBox(false); onClick(); }, className: "w-full text-sm font-medium px-4 py-3 rounded-lg bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 border border-blue-200 dark:border-blue-800 hover:bg-blue-100 dark:hover:bg-blue-900/50 transition-colors" }, "\uD83D\uDCD6 Preview README"),
                    React.createElement("div", { className: "w-full" },
                        React.createElement(HealthScoreBadge_1["default"], { repo: repo })),
                    React.createElement("a", { href: repo.html_url, target: "_blank", rel: "noopener noreferrer", className: "w-full text-sm font-medium px-4 py-3 rounded-lg bg-gray-50 dark:bg-slate-700 text-gray-700 dark:text-gray-200 border border-gray-200 dark:border-slate-600 hover:bg-gray-100 dark:hover:bg-slate-600 transition-colors text-center block" }, "\uD83D\uDD17 View on GitHub")),
                React.createElement("button", { type: "button", onClick: function () { return setShowActionBox(false); }, className: "mt-4 w-full text-xs text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 transition-colors" }, "Close"))))));
}
exports["default"] = RepositoryCard;
