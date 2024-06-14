import requests

# Fetch random joke function
def fetchJoke():
    try:
        response = requests.get('https://official-joke-api.appspot.com/random_joke')
        response.raise_for_status()  # Raise an error for bad status codes
        joke = response.json()
        return {
            'setup': joke['setup'],
            'punchline': joke['punchline']
        }
    except requests.RequestException as e:
        return {'message': 'Error fetching joke', 'error': str(e)}

# Example usage
if __name__ == "__main__":
    joke = fetchJoke()
    print(joke)
