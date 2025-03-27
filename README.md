# International Phone Input

A Mendix widget that provides phone number entry with integrated country code selection, flag display, and format validation. Perfect for global user forms requiring properly formatted international phone numbers.

## Features

- Country code selection with dropdown menu
- International phone number format validation
- Country flag display
- Compatible with Mendix validation system
- Easy integration with existing forms

## Usage

1. Download the widget from the Mendix Marketplace
2. Add the widget to your Mendix project
3. Place the widget on a page within a data view
4. Connect the widget to an attribute of type String
5. Configure the widget properties as needed

## Configuration Options

- **Attribute**: The string attribute where the phone number will be stored
- **Required**: Whether the phone number is required
- **Default Country**: Set a default selected country
- **Show Flags**: Enable/disable country flag display

## Demo Project

A demo project can be found at: [Demo Project Link]

## Issues, Suggestions and Feature Requests

Please submit issues, suggestions or feature requests on the [GitHub repository](https://github.com/yourusername/international-phone-input).

## Development and Contribution

1. Install NPM package dependencies by using: `npm install`. If you use NPM v7.x.x, which can be checked by executing `npm -v`, execute: `npm install --legacy-peer-deps`.
2. Run `npm start` to watch for code changes. On every change:
   - the widget will be bundled;
   - the bundle will be included in a `dist` folder in the root directory of the project;
   - the bundle will be included in the `deployment` and `widgets` folder of the Mendix test project.

Contributions are welcome. Please submit a pull request with your proposed changes.

## License

This widget is licensed under the Apache 2.0 License.