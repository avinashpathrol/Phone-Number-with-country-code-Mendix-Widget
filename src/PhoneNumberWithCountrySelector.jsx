import { Component, createElement } from "react";
import "./ui/PhoneNumberWithCountrySelector.css";
import { COUNTRIES, getCountryByRegionCode } from "./countryData";

export default class PhoneApp extends Component {
    constructor(props) {
        super(props);
        
        // Complete mapping for all country codes from the XML enum values
        const countryCodeMap = this.buildCountryCodeMap();
        
        // Get default country code from props or use +1 (US) as fallback
        let defaultCode = "+1"; // Default fallback
        
        // Default to United States
        let defaultCountry = COUNTRIES.find(country => 
            country.code === "+1" && country.name === "United States") || 
            COUNTRIES.find(country => country.code === "+1");
        
        // If defaultCountry is set, use its value to get the country code
        if (props.defaultCountry && props.defaultCountry !== "AUTO") {
            // Special handling for countries with shared dialing codes
            if (props.defaultCountry === "US") {
                defaultCountry = COUNTRIES.find(country => 
                    country.code === "+1" && country.name === "United States");
            }
            else if (props.defaultCountry === "CA") {
                defaultCountry = COUNTRIES.find(country => 
                    country.code === "+1" && country.name === "Canada");
            }
            // For other countries, just use the standard lookup by code
            else {
                const code = countryCodeMap[props.defaultCountry] || "+1";
                defaultCountry = COUNTRIES.find(country => country.code === code) || defaultCountry;
            }
            
            defaultCode = defaultCountry.code;
            console.log("Default country set to:", props.defaultCountry, 
                "with code:", defaultCode, 
                "and name:", defaultCountry.name);
        }
        
        // Parse initial combined phone number if available
        let initialCountryCode = defaultCode;
        let initialPhoneNumber = "";
        
        // If there's a combined phone number already stored, parse it
        if (props.combinedPhoneAttribute && 
            props.combinedPhoneAttribute.status === "available" && 
            props.combinedPhoneAttribute.value) {
            
            const combinedValue = props.combinedPhoneAttribute.value;
            const match = combinedValue.match(/(\+\d+)(\d+)/);
            
            if (match) {
                initialCountryCode = match[1]; // The country code with + sign
                const digits = match[2]; // Just the phone number digits
                initialPhoneNumber = this.formatPhoneNumber(digits);
                
                // Find the country by code
                const matchedCountry = COUNTRIES.find(country => country.code === initialCountryCode);
                if (matchedCountry) {
                    defaultCountry = matchedCountry;
                }
            } else {
                // If no clear pattern, assume it's just a phone number
                const digits = combinedValue.replace(/\D/g, '');
                initialPhoneNumber = this.formatPhoneNumber(digits);
            }
        }
        
        this.state = {
            countryCode: initialCountryCode,
            phoneNumber: initialPhoneNumber,
            hasError: false,
            errorMessage: "",
            isTouched: false,
            isBlurred: false,
            dropdownOpen: false,
            selectedCountry: defaultCountry,
            searchQuery: "",
            filteredCountries: COUNTRIES
        };
        
        this.handlePhoneNumberChange = this.handlePhoneNumberChange.bind(this);
        this.validateInput = this.validateInput.bind(this);
        this.toggleDropdown = this.toggleDropdown.bind(this);
        this.selectCountry = this.selectCountry.bind(this);
        this.handleClickOutside = this.handleClickOutside.bind(this);
        this.handleSearchChange = this.handleSearchChange.bind(this);
        this.handlePhoneNumberFocus = this.handlePhoneNumberFocus.bind(this);
        this.handlePhoneNumberBlur = this.handlePhoneNumberBlur.bind(this);
        
        // Initialize dropdownRef as null
        this.dropdownRef = null;
    }
    
    // Build a complete mapping of country codes from 2-letter codes to dialing codes
    buildCountryCodeMap() {
        // This function builds a complete mapping for all countries in your list
        const map = {};
        
        // Extract country codes from your COUNTRIES array
        COUNTRIES.forEach(country => {
            // Find the 2-letter country code from the flagPath
            // Example: https://flagcdn.com/us.svg -> US
            const flagPath = country.flagPath;
            if (flagPath) {
                const matches = flagPath.match(/\/([a-z]{2})\.svg$/);
                if (matches && matches[1]) {
                    const twoLetterCode = matches[1].toUpperCase();
                    map[twoLetterCode] = country.code;
                }
            }
        });
        
        // Manual additions for special cases
        map['UK'] = '+44'; // United Kingdom
        map['GB'] = '+44'; // Great Britain
        
        console.log("Built country code map with", Object.keys(map).length, "entries");
        return map;
    }
    
    componentDidMount() {
        // Only try to auto-detect if specifically configured to do so
        if (this.props.defaultCountry === "AUTO") {
            this.detectUserCountry();
        }
        
        document.addEventListener("mousedown", this.handleClickOutside);
    }
    
    componentDidUpdate(prevProps) {
        // Check if defaultCountry prop has changed
        if (prevProps.defaultCountry !== this.props.defaultCountry) {
            console.log("Default country changed from", prevProps.defaultCountry, "to", this.props.defaultCountry);
            
            if (this.props.defaultCountry === "AUTO") {
                this.detectUserCountry();
            } else {
                this.updateDefaultCountry();
            }
        }
    }
    
    updateDefaultCountry() {
        // Use the complete mapping built in the constructor
        const countryCodeMap = this.buildCountryCodeMap();
        let newDefaultCountry;
        
        // Special handling for countries with shared dialing codes
        if (this.props.defaultCountry === "US") {
            newDefaultCountry = COUNTRIES.find(country => 
                country.code === "+1" && country.name === "United States");
        }
        else if (this.props.defaultCountry === "CA") {
            newDefaultCountry = COUNTRIES.find(country => 
                country.code === "+1" && country.name === "Canada");
        }
        // For other countries, just use the standard lookup by code
        else {
            const defaultCode = countryCodeMap[this.props.defaultCountry] || "+1";
            console.log("Updating default country to", this.props.defaultCountry, "with code", defaultCode);
            
            // Find the country object
            newDefaultCountry = COUNTRIES.find(country => country.code === defaultCode) || 
                            COUNTRIES.find(country => country.code === "+1" && country.name === "United States");
        }
        
        // Update state with the new default country
        if (newDefaultCountry) {
            console.log("Found matching country:", newDefaultCountry.name);
            this.setState({
                selectedCountry: newDefaultCountry,
                countryCode: newDefaultCountry.code
            }, () => {
                // Update the combined value if necessary
                this.updateCombinedValue();
            });
        } else {
            console.error("Could not find country with specified code");
        }
    }
    
    componentWillUnmount() {
        document.removeEventListener("mousedown", this.handleClickOutside);
    }
    
    handleClickOutside(event) {
        if (this.dropdownRef && !this.dropdownRef.contains(event.target)) {
            this.setState({ dropdownOpen: false });
        }
    }
    
    detectUserCountry() {
        try {
            const language = navigator.language || navigator.userLanguage;
            
            if (language && language.includes('-')) {
                const countryCode = language.split('-')[1].toUpperCase();
                const matchedCountry = getCountryByRegionCode(countryCode);
                
                if (matchedCountry) {
                    this.selectCountry(matchedCountry);
                }
            }
        } catch (error) {
            console.error("Error detecting user country:", error);
        }
    }
    
    toggleDropdown() {
        this.setState(prevState => ({
            dropdownOpen: !prevState.dropdownOpen,
            searchQuery: ""
        }));
    }
    
    handleSearchChange(event) {
        const query = event.target.value.toLowerCase().trim();
        
        // Update the search query in state
        this.setState({
            searchQuery: event.target.value,
            // Filter countries based on the query
            filteredCountries: !query ? COUNTRIES : COUNTRIES.filter(country => {
                const countryName = country.name.toLowerCase();
                const countryCode = country.code.replace('+', '');
                return countryName.includes(query) || countryCode.includes(query);
            })
        });
    }
    
    handlePhoneNumberFocus() {
        this.setState({ isTouched: true });
    }
    
    handlePhoneNumberBlur() {
        this.setState({ isBlurred: true }, () => {
            this.validateInput();
        });
    }
    
    selectCountry(country) {
        if (!country) return;
        
        // Create a deep copy to ensure no reference issues
        const selectedCountry = {
            code: country.code,
            name: country.name,
            flagPath: country.flagPath
        };
        
        this.setState({
            selectedCountry,
            countryCode: selectedCountry.code,
            dropdownOpen: false,
            searchQuery: ""
        }, () => {
            this.updateCombinedValue();
            this.validateInput();
        });
    }
    
    getFlagUrl(country) {
        return country.flagPath;
    }
    
    // Format phone number as (XXX)-XXX-XXXX
    formatPhoneNumber(digits) {
        if (!digits) return "";
        
        // Format according to length
        if (digits.length <= 3) {
            return digits.length > 0 ? `(${digits}` : "";
        } else if (digits.length <= 6) {
            return `(${digits.slice(0, 3)})-${digits.slice(3)}`;
        } else {
            return `(${digits.slice(0, 3)})-${digits.slice(3, 6)}-${digits.slice(6, 10)}`;
        }
    }
    
    render() {
        const { selectedCountry, dropdownOpen, hasError, errorMessage, phoneNumber, 
                searchQuery, isTouched, isBlurred, filteredCountries } = this.state;
        
        // Extract digits for validation
        const phoneDigits = phoneNumber.replace(/\D/g, '');
        
        // Only show validation error if the field has been touched AND blurred
        // AND either there are some digits but not enough, OR there's a validation error
        const showValidationError = isTouched && isBlurred && 
            ((phoneDigits.length > 0 && phoneDigits.length < 10) || hasError);
        
        return (
            <div className="phone-input-container">
                <div 
                    className="country-selector" 
                    ref={node => { this.dropdownRef = node; }}
                >
                    <div 
                        className="selected-country" 
                        onClick={this.toggleDropdown}
                        tabIndex="0"
                    >
                        {/* Display the selected country's flag */}
                        <img 
                            src={selectedCountry.flagPath} 
                            alt={selectedCountry.name}
                            className="country-flag-img"
                        />
                        <span className="country-code">{selectedCountry.code}</span>
                        <span className="dropdown-arrow">▼</span>
                    </div>
                    
                    {dropdownOpen && (
                        <div className="country-dropdown">
                            <div className="country-search">
                                <input
                                    type="text"
                                    placeholder="Search countries..."
                                    value={searchQuery}
                                    onChange={this.handleSearchChange}
                                    onClick={e => e.stopPropagation()}
                                    autoFocus
                                />
                            </div>
                            <div className="country-list">
                                {filteredCountries.length > 0 ? (
                                    filteredCountries.map(country => (
                                        <div 
                                            key={country.code + "-" + country.name} 
                                            className="country-option"
                                            onClick={() => this.selectCountry(country)}
                                        >
                                            <img 
                                                src={this.getFlagUrl(country)} 
                                                alt={country.name}
                                                className="country-flag-img"
                                            />
                                            <span className="country-name">{country.name}</span>
                                            <span className="country-code">{country.code}</span>
                                        </div>
                                    ))
                                ) : (
                                    <div className="no-results">No countries match your search</div>
                                )}
                            </div>
                        </div>
                    )}
                </div>
                
                <div className="phone-number-input">
                    <input
                        type="tel"
                        value={phoneNumber}
                        onChange={this.handlePhoneNumberChange}
                        onFocus={this.handlePhoneNumberFocus}
                        onBlur={this.handlePhoneNumberBlur}
                        placeholder="Phone Number"
                        className={showValidationError ? "input-error" : ""}
                        disabled={this.props.combinedPhoneAttribute && this.props.combinedPhoneAttribute.readOnly}
                        aria-invalid={showValidationError}
                        aria-describedby="phone-error-message"
                    />
                </div>
                
                {showValidationError && (
                    <div id="phone-error-message" className="error-message" role="alert">
                        {phoneDigits.length < 10 ? 
                            "Please enter a 10-digit phone number" : 
                            errorMessage}
                    </div>
                )}
            </div>
        );
    }
    
    handlePhoneNumberChange(event) {
        const value = event.target.value;
        // Only allow numbers, parentheses, dashes for entry
        const cleanedValue = value.replace(/[^\d()-]/g, '');
        
        // Extract just the digits for processing
        const digitsOnly = cleanedValue.replace(/\D/g, '');
        
        // Ensure we don't exceed 10 digits
        if (digitsOnly.length <= 10) {
            // Format for display
            const formattedNumber = this.formatPhoneNumber(digitsOnly);
            
            this.setState({ 
                phoneNumber: formattedNumber,
                isTouched: true
            }, () => {
                // Update the combined value in Mendix
                this.updateCombinedValue(digitsOnly);
                // Still validate internally but don't show error
                this.validateInput();
            });
        }
    }
    
    validateInput() {
        let hasError = false;
        let errorMessage = "";
        
        // Validate country code
        if (!/^\+\d{1,3}$/.test(this.state.countryCode)) {
            hasError = true;
            errorMessage = "Invalid country code format";
        }
        
        // Validate phone number - extract digits for validation
        if (!hasError) {
            const phoneDigits = this.state.phoneNumber.replace(/\D/g, '');
            
            if (phoneDigits.length > 0 && phoneDigits.length < 10) {
                hasError = true;
                errorMessage = "Please enter a 10-digit phone number";
            } else if (phoneDigits.length > 10) {
                hasError = true;
                errorMessage = "Phone number cannot exceed 10 digits";
            }
        }
        
        this.setState({ hasError, errorMessage });
        
        // Execute onChangeAction if valid and available
        if (!hasError && this.props.onChangeAction && this.props.onChangeAction.canExecute) {
            this.props.onChangeAction.execute();
        }
        
        return !hasError;
    }
    
    // Update the combined value in Mendix
    updateCombinedValue(rawPhoneNumber) {
        if (this.props.combinedPhoneAttribute && 
            this.props.combinedPhoneAttribute.status === "available") {
            
            // Extract raw digits from formatted number if not provided
            const phoneDigits = rawPhoneNumber !== undefined ? 
                rawPhoneNumber : 
                this.state.phoneNumber.replace(/\D/g, '');
            
            // Only proceed if we have digits to avoid storing just the country code
            if (phoneDigits.length > 0) {
                // Combine country code and phone digits
                const combinedValue = `${this.state.countryCode}${phoneDigits}`;
                
                // Store in the single combined attribute
                this.props.combinedPhoneAttribute.setValue(combinedValue);
            }
            
            // For backward compatibility, also update separate attributes if they exist
            this.updateSeparateAttributes(phoneDigits);
        }
    }
    
    // For backward compatibility
    updateSeparateAttributes(rawPhoneNumber) {
        // Update country code attribute if it exists
        if (this.props.countryCodeAttribute && 
            this.props.countryCodeAttribute.status === "available") {
            this.props.countryCodeAttribute.setValue(this.state.countryCode);
        }
        
        // Update phone number attribute if it exists
        if (this.props.phoneNumberAttribute && 
            this.props.phoneNumberAttribute.status === "available") {
            const digitsToStore = rawPhoneNumber !== undefined ? 
                rawPhoneNumber : 
                this.state.phoneNumber.replace(/\D/g, '');
            
            this.props.phoneNumberAttribute.setValue(digitsToStore);
        }
    }
}