const aiResponses = {
  budget: 'Review your current spending categories and move more into savings. Set a budget cap for groceries and bills, then automate a weekly check-in.',
  savings: 'Try saving 10% of your next pay check into your emergency reserve. Small weekly contributions add up quickly.',
  loan: 'Keep your loan term and interest rate in mind. Extra repayments reduce total interest and lower your monthly payment over time.',
  investment: 'A balanced portfolio should include low-cost index funds and a cash reserve. Start with a small monthly contribution and stay consistent.',
  default: 'Focus on one financial goal at a time. Track income, cut variable costs, and keep at least three months of expenses in an emergency fund.'
};

function askAI() {
  const input = document.getElementById('aiInput');
  const response = document.getElementById('aiResponse');
  if (!input || !response) return;

  const prompt = input.value.trim().toLowerCase();
  if (!prompt) {
    response.textContent = 'Please ask a question so I can help.';
    return;
  }

  let answer = aiResponses.default;
  if (prompt.includes('budget') || prompt.includes('spend')) answer = aiResponses.budget;
  if (prompt.includes('save') || prompt.includes('savings')) answer = aiResponses.savings;
  if (prompt.includes('loan') || prompt.includes('interest')) answer = aiResponses.loan;
  if (prompt.includes('invest') || prompt.includes('investment')) answer = aiResponses.investment;

  response.textContent = answer;
  input.value = '';
}
