# Copyright (c) Microsoft Corporation. All rights reserved.
# Licensed under the MIT License.

import unittest
import numpy as np
from CountingGridsPy.models import CountingGridModel, CountingGridsModelWithGPU


class TestCorrectnessOfNontrivialDesignMatrix(unittest.TestCase):
    def setUp(self):
        M, N = [5, 7]
        self.N = N
        self.data = np.array(
            list(range(1, 8))+list(range(7, 0, -1)) +
            [1]*7+[0, 1, 0, 1, 0, 1, 0]+list(range(1, 8))
        ).reshape((M, N))

        self.extent = np.array([40, 40])
        self.window = np.array([5, 5])
        self.pi_init = np.ones([5]*2 + [N]) / 1000
        self.cpuModel = CountingGridModel(self.extent, self.window)
        self.gpuModel = CountingGridsModelWithGPU(self.extent, self.window)

    def test_fitted_model(self):
        self.cpuModel.fit(self.data, max_iter=50,
                       returnSumSquareDifferencesOfPi=False, pi=np.copy(self.pi_init))
        assert(np.all(np.isclose(self.cpuModel.q, .04)))

        assert(
            all(
                np.isclose(
                    self.cpuModel.q,
                    self.gpuModel.q.numpy()
                )
            )
        )

        assert(
            all(
                np.isclose(
                    self.cpuModel.pi,
                    self.gpuModel.pi.numpy()
                )
            )
        )
