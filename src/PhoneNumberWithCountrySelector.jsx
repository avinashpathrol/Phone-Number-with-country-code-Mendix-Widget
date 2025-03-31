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
                const matchedCountry = this.findCountryByCode(initialCountryCode);
                if (matchedCountry) {
                    defaultCountry = matchedCountry;
                }
            } else {
                // If no clear pattern, assume it's just a phone number
                const digits = combinedValue.replace(/\D/g, '');
                initialPhoneNumber = this.formatPhoneNumber(digits);
            }
        }
        
        // Determine if custom format is enabled - convert string to boolean
        const useCustomFormat = String(props.useCustomFormat).toLowerCase() === "true";
        const customFormatPattern = props.customFormatPattern || "XXX-XXX-XXXX";
        
        console.log("Constructor settings:", {
            useCustomFormat: useCustomFormat,
            customFormatPattern: customFormatPattern,
            propUseCustomFormat: props.useCustomFormat,
            propType: typeof props.useCustomFormat
        });
        
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
            filteredCountries: COUNTRIES,
            useCustomFormat: useCustomFormat,
            customFormatPattern: customFormatPattern,
            showFormatToggle: false  // For UI toggle
        };
        
        this.handlePhoneNumberChange = this.handlePhoneNumberChange.bind(this);
        this.validateInput = this.validateInput.bind(this);
        this.toggleDropdown = this.toggleDropdown.bind(this);
        this.selectCountry = this.selectCountry.bind(this);
        this.handleClickOutside = this.handleClickOutside.bind(this);
        this.handleSearchChange = this.handleSearchChange.bind(this);
        this.handlePhoneNumberFocus = this.handlePhoneNumberFocus.bind(this);
        this.handlePhoneNumberBlur = this.handlePhoneNumberBlur.bind(this);
        this.toggleCustomFormat = this.toggleCustomFormat.bind(this);
        this.handleCustomFormatChange = this.handleCustomFormatChange.bind(this);
        
        // Initialize dropdownRef as null
        this.dropdownRef = null;
    }
    
    // Find country by code with special handling for US/Canada
    findCountryByCode(code) {
        // If it's +1, prioritize the country based on defaultCountry
        if (code === "+1" && this.props.defaultCountry) {
            if (this.props.defaultCountry === "US") {
                return COUNTRIES.find(country => 
                    country.code === "+1" && country.name === "United States");
            }
            else if (this.props.defaultCountry === "CA") {
                return COUNTRIES.find(country => 
                    country.code === "+1" && country.name === "Canada");
            }
        }
        
        // Standard lookup by code
        return COUNTRIES.find(country => country.code === code);
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
        
        // Log props at mount time to debug
        console.log("Component mounted with props:", {
            useCustomFormat: this.props.useCustomFormat,
            customFormatPattern: this.props.customFormatPattern,
            typeOfUseCustom: typeof this.props.useCustomFormat
        });
        
        // Initialize from props
        if (this.props.useCustomFormat !== undefined) {
            // Convert string to boolean properly
            const useCustom = String(this.props.useCustomFormat).toLowerCase() === "true";
            
            this.setState({ 
                useCustomFormat: useCustom,
                customFormatPattern: this.props.customFormatPattern || "XXX-XXX-XXXX"
            });
            
            console.log("Setting format from props:", {
                useCustom: useCustom,
                pattern: this.props.customFormatPattern || "XXX-XXX-XXXX"
            });
            
            // Reformat the phone number if custom format is enabled
            if (useCustom) {
                const digits = this.state.phoneNumber.replace(/\D/g, '');
                if (digits) {
                    const formattedNumber = this.formatPhoneNumber(digits);
                    this.setState({ phoneNumber: formattedNumber });
                }
            }
        }
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
        
        // Check if the format option has changed
        const prevUseCustom = String(prevProps.useCustomFormat).toLowerCase() === "true";
        const currentUseCustom = String(this.props.useCustomFormat).toLowerCase() === "true";
        
        if (prevProps.phoneFormat !== this.props.phoneFormat ||
            prevUseCustom !== currentUseCustom ||
            prevProps.customFormatPattern !== this.props.customFormatPattern) {
            
            console.log("Phone format changed:", {
                prevFormat: prevProps.phoneFormat,
                newFormat: this.props.phoneFormat,
                prevUseCustom: prevUseCustom,
                newUseCustom: currentUseCustom,
                prevPattern: prevProps.customFormatPattern,
                newPattern: this.props.customFormatPattern
            });
            
            // Update state for custom format settings
            if (prevUseCustom !== currentUseCustom) {
                this.setState({ useCustomFormat: currentUseCustom });
            }
            
            if (prevProps.customFormatPattern !== this.props.customFormatPattern && this.props.customFormatPattern) {
                this.setState({ customFormatPattern: this.props.customFormatPattern });
            }
            
            // Extract digits and reformat using the new format
            const digits = this.state.phoneNumber.replace(/\D/g, '');
            if (digits) {
                const formattedNumber = this.formatPhoneNumber(digits);
                this.setState({ phoneNumber: formattedNumber });
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
    
    // Toggle custom format option
    toggleCustomFormat() {
        this.setState(prevState => {
            const newState = { useCustomFormat: !prevState.useCustomFormat };
            
            // If we just enabled custom format, also update the phone number format
            if (!prevState.useCustomFormat) {
                const digits = this.state.phoneNumber.replace(/\D/g, '');
                if (digits) {
                    const formattedNumber = this.formatPhoneNumber(digits, newState);
                    newState.phoneNumber = formattedNumber;
                }
            }
            
            return newState;
        });
    }
    
    // Handle changes to the custom format pattern
    handleCustomFormatChange(event) {
        const newPattern = event.target.value;
        
        this.setState({ customFormatPattern: newPattern }, () => {
            // Reformat the phone number using the new pattern
            const digits = this.state.phoneNumber.replace(/\D/g, '');
            if (digits) {
                const formattedNumber = this.formatPhoneNumber(digits);
                this.setState({ phoneNumber: formattedNumber });
            }
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
    
// Apply custom format to phone numbers EXACTLY as specified in the pattern
applyCustomFormat(digits, pattern) {
    if (!pattern || !digits) return digits;
    
    console.log("Applying custom format:", { digits, pattern });
    
    // For patterns with X placeholders (standard case)
    if (pattern.includes('X')) {
        // Handle X-based patterns (original logic)
        const xCount = (pattern.match(/X/g) || []).length;
        
        if (xCount < digits.length) {
            console.log("Pattern doesn't have enough X placeholders");
            return digits;
        }
        
        let result = pattern;
        let digitIndex = 0;
        
        for (let i = 0; i < pattern.length && digitIndex < digits.length; i++) {
            if (pattern[i] === 'X') {
                result = result.substring(0, i) + digits[digitIndex++] + result.substring(i + 1);
            }
        }
        
        // Remove any remaining X characters
        result = result.replace(/X/g, '');
        return result;
    } else {
        // For patterns without X, treat each numeric character as a position marker
        // and preserve all non-numeric characters exactly as they are
        
        // Count actual digits in the pattern
        const patternDigits = pattern.replace(/[^0-9]/g, '');
        const digitCount = patternDigits.length;
        
        console.log("Pattern has", digitCount, "digit positions");
        
        // If we don't have enough pattern digits, return the original digits
        if (digitCount === 0) return digits;
        
        // Create a new pattern by replacing the digits in the pattern with X
        let newPattern = pattern;
        let patternDigitIndex = 0;
        
        for (let i = 0; i < newPattern.length; i++) {
            if (/[0-9]/.test(newPattern[i])) {
                newPattern = newPattern.substring(0, i) + 'X' + newPattern.substring(i + 1);
                patternDigitIndex++;
            }
        }
        
        console.log("Converted pattern with X:", newPattern);
        
        // Now apply the X pattern logic
        let result = newPattern;
        let digitIndex = 0;
        
        for (let i = 0; i < result.length && digitIndex < digits.length; i++) {
            if (result[i] === 'X') {
                result = result.substring(0, i) + digits[digitIndex++] + result.substring(i + 1);
            }
        }
        
        // Remove any remaining X characters
        result = result.replace(/X/g, '');
        
        // If we still have digits left, append them at the end
        if (digitIndex < digits.length) {
            result += digits.substring(digitIndex);
        }
        
        console.log("Final formatted result:", result);
        return result;
    }
}
    
    // Format phone number based on selected format or custom pattern
    formatPhoneNumber(digits, stateOverride = null) {
        if (!digits) return "";
        
        // Use either the override state or the component state
        const state = stateOverride || this.state;
        const props = this.props;
        
        // DEBUGGING - Log properties
        console.log("Format properties:", {
            propsUseCustomFormat: props.useCustomFormat,
            propsCustomFormatPattern: props.customFormatPattern,
            stateUseCustom: state.useCustomFormat,
            statePattern: state.customFormatPattern
        });
        
        // Convert string to boolean properly for both props and state
        const propsUseCustom = String(props.useCustomFormat).toLowerCase() === "true";
        const stateUseCustom = state.useCustomFormat === true;
        
        // CHANGED: Check if custom format is enabled in either props or state
        const useCustom = propsUseCustom || stateUseCustom;
        
        console.log("Use custom format?", useCustom);
        
        // Use custom format if enabled
        if (useCustom) {
            const pattern = props.customFormatPattern || state.customFormatPattern || "XXX-XXX-XXXX";
            console.log("Using custom pattern:", pattern);
            return this.applyCustomFormat(digits, pattern);
        }
        
        // Otherwise use predefined formats
        const format = props.phoneFormat || "US_FORMAT";
        
        // Handle different formatting options
        switch (format) {
            case "SPACE_FORMAT":
                // Format as "XXX XXX XXXX"
                if (digits.length <= 3) {
                    return digits;
                } else if (digits.length <= 6) {
                    return `${digits.slice(0, 3)} ${digits.slice(3)}`;
                } else {
                    return `${digits.slice(0, 3)} ${digits.slice(3, 6)} ${digits.slice(6, 10)}`;
                }
            
            case "SLASH_FORMAT":
                // Format as "XXX/XXX XXXX"
                if (digits.length <= 3) {
                    return digits;
                } else if (digits.length <= 6) {
                    return `${digits.slice(0, 3)}/${digits.slice(3)}`;
                } else {
                    return `${digits.slice(0, 3)}/${digits.slice(3, 6)} ${digits.slice(6, 10)}`;
                }
            
            case "CUSTOM_FORMAT":
                // This case is for when phoneFormat is set to CUSTOM_FORMAT in the XML,
                // but the useCustomFormat toggle is not enabled
                const customPattern = props.customFormatPattern || "XXX-XXX-XXXX";
                return this.applyCustomFormat(digits, customPattern);
                
            case "US_FORMAT":
            default:
                // Default US format "(XXX)-XXX-XXXX"
                if (digits.length <= 3) {
                    return digits.length > 0 ? `(${digits}` : "";
                } else if (digits.length <= 6) {
                    return `(${digits.slice(0, 3)})-${digits.slice(3)}`;
                } else {
                    return `(${digits.slice(0, 3)})-${digits.slice(3, 6)}-${digits.slice(6, 10)}`;
                }
        }
    }
    
    render() {
        const { 
            selectedCountry, dropdownOpen, hasError, errorMessage, 
            phoneNumber, searchQuery, isTouched, isBlurred, 
            filteredCountries, useCustomFormat, customFormatPattern,
            showFormatToggle
        } = this.state;
        
        // Extract digits for validation
        const phoneDigits = phoneNumber.replace(/\D/g, '');
        
        // Only show validation error if the field has been touched AND blurred
        // AND either there are some digits but not enough, OR there's a validation error
        const showValidationError = isTouched && isBlurred && 
            ((phoneDigits.length > 0 && phoneDigits.length < 10) || hasError);
        
        return (
            <div className="phone-input-container">
                {/* Country Selector */}
                <div 
                    className="country-selector" 
                    ref={node => { this.dropdownRef = node; }}
                >
                    <div 
                        className="selected-country" 
                        onClick={this.toggleDropdown}
                        tabIndex="0"
                    >
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
                
                {/* Phone Number Input */}
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
                
                {/* Format Toggle Section */}
                {showFormatToggle && (
                    <div className="format-toggle-section">
                        <div className="toggle-container">
                            <label className="toggle-label">
                                <input
                                    type="checkbox"
                                    checked={useCustomFormat}
                                    onChange={this.toggleCustomFormat}
                                />
                                <span className="toggle-text">Use Custom Format</span>
                            </label>
                        </div>
                        
                        {useCustomFormat && (
                            <div className="custom-format-input">
                                <input
                                    type="text"
                                    value={customFormatPattern}
                                    onChange={this.handleCustomFormatChange}
                                    placeholder="Format pattern (use X for digits)"
                                />
                                <span className="format-hint">Example: XXX-XXX-XXXX or (XXX) XXX XXXX</span>
                            </div>
                        )}
                    </div>
                )}
                
                {/* Error Message */}
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
        
        // Convert useCustomFormat properly from props
        const useCustom = String(this.props.useCustomFormat).toLowerCase() === "true" || this.state.useCustomFormat === true;
        
        // Determine which characters to allow based on format
        let cleanedValue;
        
        if (useCustom) {
            // For custom format, allow any characters that might be in the pattern
            // but still filter out most non-digit characters for safety
            cleanedValue = value.replace(/[^0-9\s\-()\/\.]/g, '');
        } else {
            // For predefined formats, use specific rules
            const format = this.props.phoneFormat || "US_FORMAT";
            
            switch (format) {
                case "SPACE_FORMAT":
                    cleanedValue = value.replace(/[^\d\s]/g, ''); // Allow digits and spaces
                    break;
                case "SLASH_FORMAT":
                    cleanedValue = value.replace(/[^\d\/\s]/g, ''); // Allow digits, slashes, and spaces
                    break;
                case "CUSTOM_FORMAT":
                case "US_FORMAT":
                default:
                    cleanedValue = value.replace(/[^\d()-]/g, ''); // Allow digits, parentheses, dashes
                    break;
            }
        }
        
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