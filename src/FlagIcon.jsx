import { Component, createElement } from "react";
import { COUNTRIES } from "./countryData";

export class FlagIcon extends Component {
    constructor(props) {
        super(props);
        this.state = {
            svgContent: null,
            isLoading: true,
            hasError: false
        };
    }

    componentDidMount() {
        this.loadSvg();
    }

    componentDidUpdate(prevProps) {
        if (prevProps.countryCode !== this.props.countryCode) {
            this.loadSvg();
        }
    }

    loadSvg() {
        const { countryCode } = this.props;
        const country = COUNTRIES.find(c => c.code === countryCode);
        
        if (!country) {
            this.setState({ hasError: true, isLoading: false });
            return;
        }
        
        this.setState({ isLoading: true, hasError: false });
        
        // Use fetch to load the SVG file
        fetch(country.flagPath)
            .then(response => {
                if (!response.ok) {
                    throw new Error(`Failed to load SVG: ${response.status} ${response.statusText}`);
                }
                return response.text();
            })
            .then(svgContent => {
                // Extract the SVG content, removing any XML declarations
                const svgMatch = svgContent.match(/<svg[^>]*>[\s\S]*<\/svg>/i);
                const cleanSvg = svgMatch ? svgMatch[0] : svgContent;
                
                this.setState({ 
                    svgContent: cleanSvg,
                    isLoading: false,
                    hasError: false
                });
            })
            .catch(error => {
                console.error("Error loading SVG:", error);
                this.setState({ 
                    hasError: true,
                    isLoading: false 
                });
            });
    }

    render() {
        const { svgContent, isLoading, hasError } = this.state;
        const { className, countryCode } = this.props;
        
        // Find the country from the countryCode to get the name for the alt text
        const country = COUNTRIES.find(c => c.code === countryCode) || { name: "Country flag" };
        
        if (isLoading) {
            // Show a placeholder while loading
            return (
                <div className={`flag-icon-placeholder ${className || ""}`} 
                     title={`Loading ${country.name} flag...`} />
            );
        }
        
        if (hasError || !svgContent) {
            // Show a different placeholder for errors
            return (
                <div className={`flag-icon-error ${className || ""}`} 
                     title={`Could not load ${country.name} flag`}>
                    {country.code.substring(1, 3)}
                </div>
            );
        }
        
        return (
            <span 
                className={`flag-icon ${className || ""}`}
                dangerouslySetInnerHTML={{ __html: svgContent }}
                title={country.name}
            />
        );
    }
}