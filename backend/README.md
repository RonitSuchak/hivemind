# Hivemind backend

Python. See `../docs/DESIGN.md` for how it works and `../docs/BACKEND.md` for the API contract.

## Built so far
- `app/students.py`: the 30 simulated students and their safety moments.
- `app/brain.py`: what a student knows (Bayesian Knowledge Tracing), and when they give up.
- `app/assessment.py`: the 10-question test, answered from the brain with seeded dice.
- `app/demo.py`: one student taught three ways, printed in Terminal.

No packages to install yet: everything uses Python's standard library.

## Run
From this `backend` folder:

```bash
python3 -m unittest discover -s tests -t . -v
```

```bash
python3 -m app.demo
```
