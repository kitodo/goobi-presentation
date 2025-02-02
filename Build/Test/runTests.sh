#!/usr/bin/env bash

# Adopted/reduced from https://github.com/TYPO3/typo3/blob/f6d73fea5a8f3a5cd8537e29308f18bec65a0c92/Build/Scripts/runTests.sh

# Function to write a .env file in Build/Test
# This is read by docker compose and vars defined here are
# used in Build/Test/docker-compose.yml
setUpDockerComposeDotEnv() {
    # Delete possibly existing local .env file if exists
    [ -e .env ] && rm .env
    # Set up a new .env file for docker compose
    {
        echo "COMPOSE_PROJECT_NAME=dlf_testing"
        # To prevent access rights of files created by the testing, the docker image later
        # runs with the same user that is currently executing the script. docker compose can't
        # use $UID directly itself since it is a shell variable and not an env variable, so
        # we have to set it explicitly here.
        echo "HOST_UID=$(id -u)"
        echo "HOST_GID=$(id -g)"
        # Your local user
        echo "DLF_ROOT=${DLF_ROOT}"
        echo "HOST_USER=${USER}"
        echo "TYPO3_VERSION=${TYPO3_VERSION}"
        echo "TEST_FILE=${TEST_FILE}"
        echo "PHP_XDEBUG_ON=${PHP_XDEBUG_ON}"
        echo "PHP_XDEBUG_PORT=${PHP_XDEBUG_PORT}"
        echo "SERVER_PORT=${SERVER_PORT}"
        echo "DOCKER_PHP_IMAGE=${DOCKER_PHP_IMAGE}"
        echo "EXTRA_TEST_OPTIONS=${EXTRA_TEST_OPTIONS}"
        echo "SCRIPT_VERBOSE=${SCRIPT_VERBOSE}"
        echo "PHPUNIT_WATCH=${PHPUNIT_WATCH}"
        echo "DBMS=${DBMS}"
        echo "DATABASE_DRIVER=${DATABASE_DRIVER}"
        echo "MARIADB_VERSION=${MARIADB_VERSION}"
        echo "MYSQL_VERSION=${MYSQL_VERSION}"
        echo "PHP_VERSION=${PHP_VERSION}"
    } > .env
}

# Options -a and -d depend on each other. The function
# validates input combinations and sets defaults.
handleDbmsAndDriverOptions() {
    case ${DBMS} in
        mysql|mariadb)
            [ -z "${DATABASE_DRIVER}" ] && DATABASE_DRIVER="mysqli"
            if [ "${DATABASE_DRIVER}" != "mysqli" ] && [ "${DATABASE_DRIVER}" != "pdo_mysql" ]; then
                echo "Invalid option -a ${DATABASE_DRIVER} with -d ${DBMS}" >&2
                echo >&2
                echo "call \".Build/Test/runTests.sh -h\" to display help and valid options" >&2
                exit 1
            fi
            ;;
    esac
}

# Load help text into $HELP
read -r -d '' HELP <<EOF
Based upon TYPO3 core test runner.

Execute unit, functional and other test suites in a docker based test environment. Handles
execution of single test files, sending xdebug information to a local IDE and more.

Recommended docker version is >=20.10 for xdebug break pointing to work reliably, and
a recent docker compose (tested >=2.27.1) is needed.

Usage: $0 [options] [file]

No arguments: Run all unit tests with PHP 8.1

Options:
    -s <...>
        Specifies which test suite to run
            - composerInstall: "composer install"
            - functional: PHP functional tests
            - unit (default): PHP unit tests

    -t <11.5|12.4>
        Only with -s composerInstall
        Specifies which TYPO3 version to install. When unset, installs either the packages from
        composer.lock, or the latest version otherwise (default behavior of "composer install").
            - 11.5
            - 12.4

    -a <mysqli|pdo_mysql>
        Only with -s functional
        Specifies to use another driver, following combinations are available:
            - mysql
                - mysqli (default)
                - pdo_mysql
            - mariadb
                - mysqli (default)
                - pdo_mysql

    -d <mariadb|mysql>
        Only with -s functional
        Specifies on which DBMS tests are performed
            - mariadb (default): use mariadb
            - mysql: use MySQL server

    -i <10.2|10.3|10.4|10.5|10.6|10.11>
        Only with -d mariadb
        Specifies on which version of mariadb tests are performed
            - 10.2
            - 10.3 (default)
            - 10.4
            - 10.5
            - 10.6
            - 10.11

    -j <5.7|8.0>
        Only with -d mysql
        Specifies on which version of mysql tests are performed
            - 5.7
            - 8.0 (default)

    -p <8.1|8.2|8.3|8.4>
        Specifies the PHP minor version to be used
            - 8.1: use PHP 8.1 (default)
            - 8.2: use PHP 8.2
            - 8.3: use PHP 8.3
            - 8.4: use PHP 8.4

    -e "<phpunit options>"
        Only with -s functional|functionalDeprecated|unit|unitDeprecated|unitRandom|acceptance
        Additional options to send to phpunit (unit & functional tests) or codeception (acceptance
        tests). For phpunit, options starting with "--" must be added after options starting with "-".
        Example -e "-v --filter canRetrieveValueWithGP" to enable verbose output AND filter tests
        named "canRetrieveValueWithGP"

    -x
        Only with -s functional|functionalDeprecated|unit|unitDeprecated|unitRandom|acceptance|acceptanceInstall
        Send information to host instance for test or system under test break points. This is especially
        useful if a local PhpStorm instance is listening on default xdebug port 9003. A different port
        can be selected with -y

    -y <port>
        Send xdebug information to a different port than default 9003 if an IDE like PhpStorm
        is not listening on default port.

    -w
        Only with -s functional|unit
        Run tests in watch mode.

    -u
        Update existing typo3/core-testing-*:latest docker images and remove dangling local docker volumes.
        Maintenance call to docker pull latest versions of the main php images. The images are updated once
        in a while and only the latest ones are supported by core testing. Use this if weird test errors occur.
        Also removes obsolete image versions of typo3/core-testing-*.

    -v
        Enable verbose script output. Shows variables and docker commands.

    -h
        Show this help.
EOF

# Go to the directory this script is located, so everything else is relative
# to this dir, no matter from where this script is called.
THIS_SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" >/dev/null && pwd)"
cd "$THIS_SCRIPT_DIR" || exit 1

# Go to directory that contains the local docker-compose.yml file
# cd ../testing-docker/local || exit 1

# Set root path by checking whether realpath exists
if ! command -v realpath &> /dev/null; then
    echo "Consider installing realpath for properly resolving symlinks" >&2
    DLF_ROOT="${PWD}/../../"
else
    DLF_ROOT=$(realpath "${PWD}/../../")
fi

# Option defaults
TEST_SUITE="unit"
TYPO3_VERSION=""
DBMS="mariadb"
PHP_VERSION="8.1"
PHP_XDEBUG_ON=0
PHP_XDEBUG_PORT=9003
SERVER_PORT=8000
EXTRA_TEST_OPTIONS=""
SCRIPT_VERBOSE=0
PHPUNIT_WATCH=0
DATABASE_DRIVER=""
MARIADB_VERSION="10.3"
MYSQL_VERSION="8.0"

# Option parsing
# Reset in case getopts has been used previously in the shell
OPTIND=1
# Array for invalid options
INVALID_OPTIONS=();
# Simple option parsing based on getopts (! not getopt)
while getopts ":a:s:t:d:i:j:p:e:xy:whuv" OPT; do
    case ${OPT} in
        s)
            TEST_SUITE=${OPTARG}
            ;;
        t)
            TYPO3_VERSION=${OPTARG}
            ;;
        a)
            DATABASE_DRIVER=${OPTARG}
            ;;
        d)
            DBMS=${OPTARG}
            ;;
        i)
            MARIADB_VERSION=${OPTARG}
            if ! [[ ${MARIADB_VERSION} =~ ^(10.3|10.4|10.5|10.6|10.11)$ ]]; then
                INVALID_OPTIONS+=("${OPTARG}")
            fi
            ;;
        j)
            MYSQL_VERSION=${OPTARG}
            if ! [[ ${MYSQL_VERSION} =~ ^(5.7|8.0)$ ]]; then
                INVALID_OPTIONS+=("${OPTARG}")
            fi
            ;;
        p)
            PHP_VERSION=${OPTARG}
            if ! [[ ${PHP_VERSION} =~ ^(8.1|8.2|8.3|8.4)$ ]]; then
                INVALID_OPTIONS+=("${OPTARG}")
            fi
            ;;
        e)
            EXTRA_TEST_OPTIONS=${OPTARG}
            ;;
        x)
            PHP_XDEBUG_ON=1
            ;;
        y)
            PHP_XDEBUG_PORT=${OPTARG}
            ;;
        w)
            PHPUNIT_WATCH=1
            ;;
        h)
            echo "${HELP}"
            exit 0
            ;;
        u)
            TEST_SUITE=update
            ;;
        v)
            SCRIPT_VERBOSE=1
            ;;
        \?)
            INVALID_OPTIONS+=("${OPTARG}")
            ;;
        :)
            INVALID_OPTIONS+=("${OPTARG}")
            ;;
    esac
done

# Exit on invalid options
if [ ${#INVALID_OPTIONS[@]} -ne 0 ]; then
    echo "Invalid option(s):" >&2
    for I in "${INVALID_OPTIONS[@]}"; do
        echo "-"${I} >&2
    done
    echo >&2
    echo "call \".Build/Test/runTests.sh -h\" to display help and valid options"
    exit 1
fi

# Move "8.x" to "php8x", the latter is the docker container name
DOCKER_PHP_IMAGE=$(echo "php${PHP_VERSION}" | sed -e 's/\.//')

# Set $1 to first mass argument, this is the optional test file or test directory to execute
shift $((OPTIND - 1))
TEST_FILE=${1}

if [ ${SCRIPT_VERBOSE} -eq 1 ]; then
    set -x
fi

# Suite execution
case ${TEST_SUITE} in
    composerInstall)
        setUpDockerComposeDotEnv
        docker compose run composer_install
        SUITE_EXIT_CODE=$?
        docker compose down
        ;;
    functional)
        handleDbmsAndDriverOptions
        setUpDockerComposeDotEnv
        case ${DBMS} in
            mariadb|mysql)
                echo "Using driver: ${DATABASE_DRIVER}"
                docker compose run functional
                SUITE_EXIT_CODE=$?
                ;;
            *)
                echo "Functional tests don't run with DBMS ${DBMS}" >&2
                echo >&2
                echo "call \".Build/Test/runTests.sh -h\" to display help and valid options" >&2
                exit 1
        esac
        docker compose down
        ;;
    unit)
        setUpDockerComposeDotEnv
        docker compose run unit
        SUITE_EXIT_CODE=$?
        docker compose down
        ;;
    update)
        # pull typo3/core-testing-*:latest versions of those ones that exist locally
        docker images typo3/core-testing-*:latest --format "{{.Repository}}:latest" | xargs -I {} docker pull {}
        # remove "dangling" typo3/core-testing-* images (those tagged as <none>)
        docker images typo3/core-testing-* --filter "dangling=true" --format "{{.ID}}" | xargs -I {} docker rmi {}
        ;;
    *)
        echo "Invalid -s option argument ${TEST_SUITE}" >&2
        echo >&2
        echo "${HELP}" >&2
        exit 1
esac

case ${DBMS} in
    mariadb)
        DBMS_OUTPUT="DBMS: ${DBMS}  version ${MARIADB_VERSION}  driver ${DATABASE_DRIVER}"
        ;;
    mysql)
        DBMS_OUTPUT="DBMS: ${DBMS}  version ${MYSQL_VERSION}  driver ${DATABASE_DRIVER}"
        ;;
    *)
        DBMS_OUTPUT="DBMS not recognized: $DBMS"
        exit 1
esac

# Print summary
if [ ${SCRIPT_VERBOSE} -eq 1 ]; then
    # Turn off verbose mode for the script summary
    set +x
fi
echo "" >&2
echo "###########################################################################" >&2
if [[ ${TEST_SUITE} =~ ^(functional)$ ]]; then
    echo "Result of ${TEST_SUITE}" >&2
    echo "PHP: ${PHP_VERSION}" >&2
    echo "${DBMS_OUTPUT}" >&2
else
    echo "Result of ${TEST_SUITE}" >&2
    echo "PHP: ${PHP_VERSION}" >&2
fi

if [[ ${SUITE_EXIT_CODE} -eq 0 ]]; then
    echo "SUCCESS" >&2
else
    echo "FAILURE" >&2
fi
echo "###########################################################################" >&2
echo "" >&2

# Exit with code of test suite - This script return non-zero if the executed test failed.
exit $SUITE_EXIT_CODE
