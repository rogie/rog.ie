import * as React from 'react';
import './Tabbar.css';

class Tabbar extends React.Component {
    constructor(props) {
        super(props);
        this.tabs = this.props.options;
        this.state = {
            selectedTab: this.props.selected || this.props.options[0]
        };
    }

    tabClick = (event, tab) => {
        this.setState({ selectedTab: tab });
        let tabBar = event.target.parentNode;
        tabBar.scroll(event.target.offsetLeft - tabBar.offsetWidth / 2 + event.target.offsetWidth / 2, 0)
        if (this.props.onClick) {
            const val = tab.constructor === String ? tab : tab.value;
            this.props.onClick(val);
        }
    }

    render() {
        return (
            <div className={'tabbar ' + this.props.className}>
                <nav className="tabbar-nav">
                    {this.tabs.map((tab, index) => {
                        return (
                            <a
                                key={index}
                                className={this.state.selectedTab === tab ? "tab selected" : "tab"}
                                onClick={() => this.tabClick(event, tab)}>
                                <span className="tab-label">
                                    {tab.constructor === String ? tab : tab.label}
                                </span>
                                <span className="tab-faux-label">
                                    {tab.constructor === String ? tab : tab.label}
                                </span>
                            </a>
                        );
                    })}
                </nav>
            </div>
        );
    }
}

export default Tabbar;
