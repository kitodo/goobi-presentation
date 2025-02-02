# Development

## Testing

Before running any of the tests, please install the project dependencies. Choose which version of TYPO3 you would like to test against.

```bash
# If you use PHP 8.1 (supported by Kitodo)
composer update --with=typo3/cms-core:^11.5

# If you use PHP 8
composer install-via-docker -- -t 11.5
composer install-via-docker -- -t 12.4
```

### Quick Start

```bash
# Run all tests
composer test

# Run specific kind of tests
composer test:unit
composer test:unit:local  # Run using locally installed PHP
composer test:func

# Run tests in watch mode
composer test:unit:watch
composer test:func:watch
```

### Run Tests Manually

Unit tests may be run either via a locally installed Composer / PHP setup, or within a Docker container.

```bash
# Run locally
vendor/bin/phpunit -c Build/Test/UnitTests.xml

# Run in Docker
Build/Test/runTests.sh
Build/Test/runTests.sh -w  # Watch mode
```

Functional tests may only be run in Docker as they require more infrastructure to be set up.

```bash
Build/Test/runTests.sh -s functional
Build/Test/runTests.sh -s functional -w  # Watch mode
```

To learn about available options (e.g., to select the PHP version), check the usage info:

```bash
Build/Test/runTests.sh -h
```

You may also interact with the Docker containers directly:

```bash
cd Build/Test/
vim .env  # Edit configuration
docker compose run unit
docker compose run functional
docker compose down
```

### Fixtures

- Datasets may be created, for example, by exporting records from [MySQL Workbench](https://www.mysql.com/de/products/workbench/).
- When writing datasets, please use `uid`s that are easy to search (`grep`) for, and that ideally prevent merge conflicts.
  Some test cases use random nine-digit numbers (`rand(100000000, 999999999)`).

### File Structure

- `Build/Test/`: Test-related setup files (e.g. configuration for PHPUnit and testing container)
- `Tests/`: Test cases. In unit tests, namespacing follows the structure of `Classes/`.
- `Tests/Fixtures`: Datasets to use in functional tests.

### External Links

- [TYPO3 Testing Framework](https://github.com/TYPO3/testing-framework)
- [TYPO3 Explained: Extension testing](https://docs.typo3.org/m/typo3/reference-coreapi/9.5/en-us/Testing/ExtensionTesting.html)
- [typo3/cms-styleguide](https://github.com/TYPO3/styleguide)

## Documentation

Build the documentation using the `docs:build` script with Composer. This
script generates the documentation using the rendering tool for Typo3 and
places it in the `Documentation-GENERATED-temp` folder.

```bash
composer docs:build
```

Take a look at the documentation by opening the file `Index.html` in the folder
`Documentation-GENERATED-temp` in your browser.

### Provide via HTTP Server (optional)

Starts the HTTP server and mounts the mandatory directory `Documentation-GENERATED-temp`.

```bash
composer docs:start
```

Take a look at the documentation by opening <http://localhost:8000>
in your browser.

The server runs in detached mode, so you will need to stop it manually.

```bash
composer docs:stop
```

### Database Documentation

Generate the database reference table:

```bash
composer install
composer docs:db
```

### Troubleshooting

#### Permission

The documentation container runs as a non-root user. If there are some problem regarding
the permission of container user you can link the UID and GID of host into the container
using the `--user` parameter.

**Example:**

```bash
docker run --rm --user=$(id -u):$(id -g) [...]
```

_In the `docs:build` Composer script, this parameter is already included.
If any issues arise, you can adjust or remove it as needed._

#### Output directory

The default documentation directory name is `Documentation-GENERATED-temp`.
If you want to change the directory name add the `--output` parameter at the
end of the building command.

**Example:**

```bash
[...] --config ./Documentation --output="My_Documentation_Directory"
```
