The sole purpose of this application/webapp to be:

- A great full height, full width, non scrollable landing page where only option to upload resume
  Processes the uploaded resume, parses and stores a context of it for AI model usage.
- once done, it should take to another screen where there vertical folder list like buttons with a add button on top table like structure table is basically to list all built resumes as of now or empty state and the uploaded resume as uploaded tag
- now when user clicks add button a popup dialog opens asking for the JD - job description, where user puts job description and custom input, which is then used to generate their new resume complete new based on the context they have. Till it's being generated modal closes, in progress state below the table entry of the resume ( ai generates the title of the resume too and saves it)
- user can download that resume any given time anytime or generate new as many as they like
- all under autnehtication
- use postgresdb locally running no docker and stuff. create db in the psotgres if you like user is postgres password is postgres
- keep the generated resumes saved in a temp directory right here in the project

Note: the generate resume keep in considetation based on user uploaded resume we find what could cause the resume to be dropped or rejected or rejected by ATS, find deep root causes, you are true checker, for positions like engineering software developer and stuff. You are strict checker. to ai and it should do that.

Create the project and ai rule

- Keep prompts in yaml
- use locally running llm, use some kind of lib which takes care of all the nitty gritty of connecting to Llms be it local or cloud providers
- env in env files
- use uv for python, yarn for js eco system no npm or pip
- use any best component library for ui
- backend must be structured not too much, keep it simple as thsi is a simple project, not too much folders keep things simple not too much abstraction
- query directly using raw sql or ORM your choice
- Let use download in any format they like, markdown, docx or pdf (default)
