"""Small dependency-free CLI/library example."""
import argparse


def greeting(name):
    return f"Hello, {name}!"


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("name")
    print(greeting(parser.parse_args().name))


if __name__ == "__main__":
    main()
