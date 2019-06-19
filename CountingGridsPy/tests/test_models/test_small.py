# Copyright (c) Microsoft Corporation. All rights reserved.
# Licensed under the MIT License.

import unittest
import numpy as np
from CountingGridsPy.models import CountingGridModel


class TestCorrectnessOfNontrivialDesignMatrix(unittest.TestCase):
    def setUp(self):
        M, N = [5, 7]
        self.N = N
        self.data = np.array(
            list(range(1, 8))+list(range(7, 0, -1)) +
            [1]*7+[0, 1, 0, 1, 0, 1, 0]+list(range(1, 8))
        ).reshape((M, N))
        # note: after one iteration h distribution is the same regardless of position on matrix or window size
        self.extent = np.array([5, 5])
        window = np.array([2, 3])
        self.pi_init = np.ones([5]*2+[N])/1000
        self.model = CountingGridModel(self.extent, window)

    def test_correct_data(self):
        assert(sum(sum(self.data)) == 94)

    def test_fitted_model(self):
        self.model.fit(self.data, max_iter=1,
                       returnSumSquareDifferencesOfPi=False, pi=np.copy(self.pi_init))
        assert(np.all(np.isclose(self.model.q, .04)))
